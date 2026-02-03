"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
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
  erConnection,
  findWorldPda,
  checkPlayerExists,
  checkSessionDelegated,
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
  const localStateRef = useRef<LocalGameState>(localState);

  // Session keypair for auto-signing ER transactions (no wallet popup)
  const sessionKeypairRef = useRef<Keypair | null>(null);


  // Keep localStateRef in sync with localState (for use in callbacks without causing re-renders)
  useEffect(() => {
    localStateRef.current = localState;
  }, [localState]);

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
      console.log("[StartGame] === STARTING GAME ===");
      console.log("[StartGame] Character:", characterId, "PublicKey:", publicKey?.toBase58());

      if (!publicKey || !signTransaction) {
        setError("Wallet not connected");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Check if session is already delegated (from a previous unfinished game)
        // Use solanaConnection directly for consistent L1 checks
        const isDelegated = await checkSessionDelegated(solanaConnection, WORLD_ID, publicKey);
        console.log("[StartGame] Session delegated status:", isDelegated);

        if (isDelegated) {
          // STEP 0: Undelegate previous session first
          console.log("[StartGame] Session already delegated, undelegating first...");
          try {
            // Get fresh blockhash with retry - use ER connection directly
            let sigUndelegate: string | null = null;
            for (let retry = 0; retry < 3; retry++) {
              try {
                // Create fresh transaction for each attempt
                const undelegateTx = await buildUndelegateSessionTx(worldPda, WORLD_ID, publicKey);
                const { blockhash, lastValidBlockHeight } = await erConnection.getLatestBlockhash();
                console.log("[StartGame] Attempt", retry + 1, "- Got ER blockhash:", blockhash.slice(0, 16) + "...");
                undelegateTx.recentBlockhash = blockhash;
                undelegateTx.feePayer = publicKey;

                const signedUndelegate = await signTransaction(undelegateTx);
                sigUndelegate = await erConnection.sendRawTransaction(
                  signedUndelegate.serialize(),
                  { skipPreflight: true }
                );

                // Wait for confirmation with timeout
                await erConnection.confirmTransaction(
                  { signature: sigUndelegate, blockhash, lastValidBlockHeight },
                  "confirmed"
                );
                console.log("[StartGame] Undelegated:", sigUndelegate);
                break; // Success, exit retry loop
              } catch (retryErr) {
                console.warn(`[StartGame] Undelegate attempt ${retry + 1} failed:`, retryErr);
                if (retry === 2) throw retryErr;
                await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
              }
            }

            // Poll L1 until account is no longer delegated (max 30 seconds)
            // Use solanaConnection directly to avoid wallet adapter caching
            console.log("[StartGame] Waiting for undelegation to propagate to L1...");
            const maxAttempts = 30;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Use solanaConnection (fresh L1 connection) instead of wallet's connection
              const stillDelegated = await checkSessionDelegated(solanaConnection, WORLD_ID, publicKey);
              console.log(`[StartGame] Poll attempt ${attempt}/${maxAttempts}: delegated=${stillDelegated}`);
              if (!stillDelegated) {
                console.log("[StartGame] Undelegation propagated to L1!");
                break;
              }
              if (attempt === maxAttempts) {
                throw new Error("Undelegation did not propagate to L1 within 30 seconds");
              }
            }
          } catch (undelegateErr) {
            console.warn("[StartGame] Undelegate failed:", undelegateErr);
            throw undelegateErr; // Don't continue if undelegation fails
          }
        }

        // Continue with normal flow (same for both cases now)
        // STEP 1: Start game (L1)
        console.log("[StartGame] Starting new game on L1...");
        const tx = await buildStartGameTx(worldPda, WORLD_ID, publicKey, characterId, connection);
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        tx.feePayer = publicKey;

        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, "confirmed");
        console.log("[StartGame] Started game on L1:", sig);

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

        // Create session keypair for auto-signing ER transactions
        sessionKeypairRef.current = Keypair.generate();
        console.log("[StartGame] Session keypair:", sessionKeypairRef.current.publicKey.toBase58());

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

  // Sync local state to ER (gasless) - uses session keypair for auto-signing
  const syncToER = useCallback(async () => {
    if (!publicKey || !sessionKeypairRef.current || localState.isPaused) return;

    try {
      const sessionKp = sessionKeypairRef.current;

      // Entity derived from user's wallet, signed by session keypair
      const tx = await buildUpdateStatsTx(
        worldPda,
        WORLD_ID,
        publicKey,           // entityOwner - for PDA derivation
        sessionKp.publicKey, // signer - session keypair
        {
          hp: localState.hp,
          xp: localState.xp,
          goldEarned: localState.gold,
          timeSurvived: localState.timeSurvived,
          wave: localState.wave,
          kills: localState.kills,
          level: localState.level,
          isDead: localState.isDead,
        },
        magicRouterConnection
      );

      tx.recentBlockhash = (await magicRouterConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = sessionKp.publicKey;

      // Auto-sign with session keypair - NO WALLET POPUP!
      tx.sign(sessionKp);

      await magicRouterConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
    } catch (err) {
      console.warn("ER sync error (non-fatal):", err);
    }
  }, [publicKey, worldPda, localState]);

  // Instant sync on kill - uses session keypair for auto-signing (no wallet popup!)
  const syncKillToER = useCallback(async () => {
    if (!publicKey || !sessionKeypairRef.current) return;

    const state = localStateRef.current;
    if (state.isPaused) return;

    // Throttle to 100ms between transactions
    const now = Date.now();
    if (now - lastKillSyncRef.current < 100) return;
    lastKillSyncRef.current = now;

    try {
      const sessionKp = sessionKeypairRef.current;

      // Entity derived from user's wallet, signed by session keypair
      const tx = await buildUpdateStatsTx(
        worldPda,
        WORLD_ID,
        publicKey,           // entityOwner
        sessionKp.publicKey, // signer
        {
          hp: state.hp,
          xp: state.xp,
          goldEarned: state.gold,
          timeSurvived: state.timeSurvived,
          wave: state.wave,
          kills: state.kills,
          level: state.level,
          isDead: state.isDead,
        },
        magicRouterConnection
      );

      tx.recentBlockhash = (await magicRouterConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = sessionKp.publicKey;

      // Auto-sign with session keypair - NO WALLET POPUP!
      tx.sign(sessionKp);

      const sig = await magicRouterConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      console.log("[KillTx] Auto-signed:", sig);
      setTxCount(prev => prev + 1);
    } catch (err) {
      // Silent fail - ER transactions are not critical
      console.warn("[KillTx] Failed:", err);
    }
  }, [publicKey, worldPda]);

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
        // Wait for confirmation before proceeding
        await magicRouterConnection.confirmTransaction(sigUndelegate, "confirmed");
        console.log("[EndGame] Undelegated:", sigUndelegate);
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
