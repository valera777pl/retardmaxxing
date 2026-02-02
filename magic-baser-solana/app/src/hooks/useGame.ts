"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  LocalGameState,
  GameScreen,
  PlayerData,
  GameSessionData,
} from "@/types";
import {
  GAME_SYNC_INTERVAL_MS,
  DEFAULT_CHARACTER,
  CharacterId,
} from "@/solana/constants";
import {
  solanaConnection,
  magicRouterConnection,
  findWorldPda,
  checkPlayerExists,
} from "@/solana/client";
import {
  buildInitPlayerTx,
  buildStartGameTx,
  buildUpdateStatsTx,
  buildUseReviveTx,
  buildEndGameTx,
  buildDelegateSessionTx,
  buildUndelegateSessionTx,
} from "@/solana/systems";

// World ID created on devnet
const WORLD_ID = new BN(2421);

export function useGame() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  // State
  const [screen, setScreen] = useState<GameScreen>("loading");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [sessionData, setSessionData] = useState<GameSessionData | null>(null);
  const [localState, setLocalState] = useState<LocalGameState>({
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    gold: 0,
    wave: 1,
    kills: 0,
    timeSurvived: 0,
    isDead: false,
    isPaused: false,
  });
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterId>(DEFAULT_CHARACTER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction counter for kill transactions
  const [txCount, setTxCount] = useState(0);

  // Refs for game loop
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastKillSyncRef = useRef<number>(0);

  // Derived values
  const worldPda = findWorldPda({ worldId: WORLD_ID });

  // Check if player exists on-chain
  const playerExists = useCallback(async () => {
    if (!publicKey) return false;
    return checkPlayerExists(connection, WORLD_ID, publicKey);
  }, [publicKey, connection]);

  // Initialize player on-chain (or skip if already exists)
  const initializePlayer = useCallback(
    async (name: string) => {
      if (!publicKey || !signTransaction) {
        setError("Wallet not connected");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await buildInitPlayerTx(worldPda, WORLD_ID, publicKey, name, connection);

        if (tx) {
          // Player doesn't exist, create it
          tx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          tx.feePayer = publicKey;

          const signed = await signTransaction(tx);
          const sig = await connection.sendRawTransaction(signed.serialize());
          await connection.confirmTransaction(sig, "confirmed");
        }

        setScreen("character-select");
        return true;
      } catch (err) {
        console.error("Init player error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signTransaction, worldPda, connection]
  );

  // Start game - creates session on-chain and calls start_game system
  const startGame = useCallback(
    async (characterId: CharacterId) => {
      if (!publicKey || !signTransaction) {
        setError("Wallet not connected");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // STEP 1: Start game (L1)
        const tx = await buildStartGameTx(worldPda, WORLD_ID, publicKey, characterId, connection);
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        tx.feePayer = publicKey;

        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        // STEP 2: Delegate GameSession to ER (L1)
        console.log("[StartGame] Delegating GameSession to ER...");
        const delegateTx = await buildDelegateSessionTx(worldPda, WORLD_ID, publicKey, connection);
        delegateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        delegateTx.feePayer = publicKey;
        const signedDelegate = await signTransaction(delegateTx);
        const sigDelegate = await connection.sendRawTransaction(signedDelegate.serialize(), { skipPreflight: true });
        await connection.confirmTransaction(sigDelegate, "confirmed");
        console.log("[StartGame] Delegation successful:", sigDelegate);

        // Reset local state for new game
        setLocalState({
          hp: 100,
          maxHp: 100,
          xp: 0,
          level: 1,
          gold: 0,
          wave: 1,
          kills: 0,
          timeSurvived: 0,
          isDead: false,
          isPaused: false,
        });

        // Reset transaction counter
        setTxCount(0);
        lastKillSyncRef.current = 0;

        gameStartTimeRef.current = Date.now();
        setSelectedCharacter(characterId);
        setScreen("playing");

        return true;
      } catch (err) {
        console.error("Start game error:", err);
        setError(err instanceof Error ? err.message : "Failed to start game");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signTransaction, worldPda, connection]
  );

  // Sync local state to ER (gasless)
  const syncToER = useCallback(async () => {
    if (!publicKey || !signTransaction || localState.isPaused) return;

    try {
      const tx = await buildUpdateStatsTx(worldPda, WORLD_ID, publicKey, {
        hp: localState.hp,
        xp: localState.xp,
        goldEarned: localState.gold,
        timeSurvived: localState.timeSurvived,
        wave: localState.wave,
        kills: localState.kills,
        level: localState.level,
        isDead: localState.isDead,
      }, magicRouterConnection);

      // Use Magic Router for gasless ER transactions
      tx.recentBlockhash = (
        await magicRouterConnection.getLatestBlockhash()
      ).blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      await magicRouterConnection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
      });
    } catch (err) {
      console.warn("ER sync error (non-fatal):", err);
    }
  }, [publicKey, signTransaction, worldPda, localState]);

  // Instant sync on kill (with throttle) - demonstrates MagicBlock speed
  const syncKillToER = useCallback(async () => {
    // 1. First check wallet connection
    if (!publicKey || !signTransaction) {
      console.log("[KillTx] Wallet not connected");
      return;
    }
    if (localState.isPaused) {
      console.log("[KillTx] Game paused, skipping");
      return;
    }

    // 2. Throttle AFTER wallet check (fixes stale timestamp if wallet disconnects)
    const now = Date.now();
    if (now - lastKillSyncRef.current < 100) {
      console.log("[KillTx] Throttled");
      return;
    }
    lastKillSyncRef.current = now;

    try {
      console.log("[KillTx] Building transaction...", { kills: localState.kills });

      const tx = await buildUpdateStatsTx(worldPda, WORLD_ID, publicKey, {
        hp: localState.hp,
        xp: localState.xp,
        goldEarned: localState.gold,
        timeSurvived: localState.timeSurvived,
        wave: localState.wave,
        kills: localState.kills,
        level: localState.level,
        isDead: localState.isDead,
      }, magicRouterConnection);

      console.log("[KillTx] Getting blockhash...");
      tx.recentBlockhash = (
        await magicRouterConnection.getLatestBlockhash()
      ).blockhash;
      tx.feePayer = publicKey;

      console.log("[KillTx] Signing...");
      const signed = await signTransaction(tx);

      console.log("[KillTx] Sending to MagicBlock ER...");
      const sig = await magicRouterConnection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
      });

      console.log("[KillTx] SUCCESS! Signature:", sig);
      setTxCount(prev => prev + 1);
    } catch (err) {
      console.error("[KillTx] FAILED:", err);
    }
  }, [publicKey, signTransaction, worldPda, localState]); // Removed txCount from deps!

  // Start sync loop
  const startSyncLoop = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      syncToER();
    }, GAME_SYNC_INTERVAL_MS);
  }, [syncToER]);

  // Stop sync loop
  const stopSyncLoop = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Use revive (L1 transaction)
  const useRevive = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setError("Wallet not connected");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const tx = await buildUseReviveTx(worldPda, WORLD_ID, publicKey, connection);
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      // Update local state
      setLocalState((prev) => ({
        ...prev,
        isDead: false,
        hp: Math.floor(prev.maxHp / 2),
      }));

      setScreen("playing");
      startSyncLoop();

      return true;
    } catch (err) {
      console.error("Revive error:", err);
      setError(err instanceof Error ? err.message : "Failed to revive");
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, worldPda, connection, startSyncLoop]);

  // End game - calls end_game system to mark session as inactive
  const endGame = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      stopSyncLoop();
      setScreen("results");
      return true;
    }

    stopSyncLoop();
    setLoading(true);

    try {
      // STEP 1: Undelegate GameSession (ER → L1)
      console.log("[EndGame] Undelegating GameSession from ER...");
      try {
        const undelegateTx = await buildUndelegateSessionTx(worldPda, WORLD_ID, publicKey);
        undelegateTx.recentBlockhash = (await magicRouterConnection.getLatestBlockhash()).blockhash;
        undelegateTx.feePayer = publicKey;
        const signedUndelegate = await signTransaction(undelegateTx);
        const sigUndelegate = await magicRouterConnection.sendRawTransaction(signedUndelegate.serialize(), { skipPreflight: true });
        console.log("[EndGame] Undelegate sent:", sigUndelegate);
        // Wait for undelegation to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (undelegateErr) {
        console.warn("[EndGame] Undelegate failed (continuing anyway):", undelegateErr);
      }

      // STEP 2: End game (L1)
      const tx = await buildEndGameTx(worldPda, WORLD_ID, publicKey, connection);
      tx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      console.log("[EndGame] End game confirmed:", sig);

      setScreen("results");
      return true;
    } catch (err) {
      console.error("End game error:", err);
      // Still go to results even if transaction fails
      setScreen("results");
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, worldPda, connection, stopSyncLoop]);

  // Handle player death
  const onPlayerDeath = useCallback(() => {
    setLocalState((prev) => ({ ...prev, isDead: true }));
    stopSyncLoop();
    setScreen("dead");
  }, [stopSyncLoop]);

  // Update local game state (called by game engine)
  const updateLocalState = useCallback(
    (updates: Partial<LocalGameState>) => {
      setLocalState((prev) => {
        const newState = { ...prev, ...updates };

        // Check for death
        if (newState.hp <= 0 && !prev.isDead) {
          onPlayerDeath();
        }

        return newState;
      });
    },
    [onPlayerDeath]
  );

  // Initialize on wallet connect
  useEffect(() => {
    if (connected && publicKey) {
      playerExists().then((exists) => {
        if (exists) {
          setScreen("character-select");
        } else {
          setScreen("menu");
        }
      });
    } else {
      setScreen("menu");
    }
  }, [connected, publicKey, playerExists]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSyncLoop();
    };
  }, [stopSyncLoop]);

  return {
    // State
    screen,
    setScreen,
    playerData,
    sessionData,
    localState,
    selectedCharacter,
    loading,
    error,
    connected,
    publicKey,
    txCount,

    // Actions
    initializePlayer,
    startGame,
    useRevive,
    endGame,
    updateLocalState,
    setSelectedCharacter,
    syncKillToER,
  };
}
