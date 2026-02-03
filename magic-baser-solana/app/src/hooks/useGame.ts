"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  LocalGameState,
  GameScreen,
  PlayerData,
} from "@/types";
import {
  GAME_SYNC_INTERVAL_MS,
  DEFAULT_CHARACTER,
  CharacterId,
  WORLD_ID as WORLD_ID_NUMBER,
} from "@/solana/constants";
import {
  solanaConnection,
  erConnection,
  findWorldPda,
  checkPlayerExists,
  checkSessionDelegated,
  fetchPlayerData,
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
import { useGuest } from "@/contexts/GuestContext";

// World ID from constants (BN for SDK compatibility)
const WORLD_ID = new BN(WORLD_ID_NUMBER);

export function useGame() {
  const { publicKey: walletPublicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { isGuestMode, guestServerWallet, nickname: guestNickname } = useGuest();

  // Effective public key: wallet or guest server wallet
  const publicKey = isGuestMode ? guestServerWallet : walletPublicKey;

  // State
  const [screen, setScreen] = useState<GameScreen>("loading");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
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

  // Helper: sign and send via API (guest mode)
  const signAndSendViaAPI = useCallback(async (tx: Transaction, isER = false): Promise<string> => {
    // Need to set a blockhash before serializing (API will replace with fresh one)
    const conn = isER ? erConnection : solanaConnection;
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = guestServerWallet!;

    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    const response = await fetch("/api/guest/sign-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serializedTx, isER }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Transaction failed");
    }
    return data.signature;
  }, [guestServerWallet]);

  // Check if player exists on-chain
  const playerExists = useCallback(async () => {
    if (!publicKey) return false;
    return checkPlayerExists(connection, WORLD_ID, publicKey);
  }, [publicKey, connection]);

  // Initialize player on-chain (or skip if already exists)
  const initializePlayer = useCallback(
    async (name: string) => {
      if (!publicKey) {
        setError("No wallet available");
        return false;
      }

      // Guest mode: use API
      if (isGuestMode) {
        setLoading(true);
        setError(null);

        try {
          const tx = await buildInitPlayerTx(worldPda, WORLD_ID, publicKey, name, solanaConnection);

          if (tx) {
            await signAndSendViaAPI(tx, false);
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
      }

      // Wallet mode: use signTransaction
      if (!signTransaction) {
        setError("Wallet not connected");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const tx = await buildInitPlayerTx(worldPda, WORLD_ID, publicKey, name, connection);

        if (tx) {
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
    [publicKey, signTransaction, worldPda, connection, isGuestMode, signAndSendViaAPI]
  );

  // Start game - creates session on-chain and calls start_game system
  const startGame = useCallback(
    async (characterId: CharacterId) => {
      console.log("[StartGame] === STARTING GAME ===");
      console.log("[StartGame] Character:", characterId, "PublicKey:", publicKey?.toBase58(), "GuestMode:", isGuestMode);

      if (!publicKey) {
        setError("No wallet available");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Check if session is already delegated (from a previous unfinished game)
        const isDelegated = await checkSessionDelegated(solanaConnection, WORLD_ID, publicKey);
        console.log("[StartGame] Session delegated status:", isDelegated);

        if (isDelegated) {
          // STEP 0: Undelegate previous session first
          console.log("[StartGame] Session already delegated, undelegating first...");
          try {
            for (let retry = 0; retry < 3; retry++) {
              try {
                const undelegateTx = await buildUndelegateSessionTx(worldPda, WORLD_ID, publicKey);
                const { blockhash, lastValidBlockHeight } = await erConnection.getLatestBlockhash();
                console.log("[StartGame] Attempt", retry + 1, "- Got ER blockhash:", blockhash.slice(0, 16) + "...");
                undelegateTx.recentBlockhash = blockhash;
                undelegateTx.feePayer = publicKey;

                if (isGuestMode) {
                  await signAndSendViaAPI(undelegateTx, true);
                } else if (signTransaction) {
                  const signedUndelegate = await signTransaction(undelegateTx);
                  const sigUndelegate = await erConnection.sendRawTransaction(
                    signedUndelegate.serialize(),
                    { skipPreflight: true }
                  );
                  await erConnection.confirmTransaction(
                    { signature: sigUndelegate, blockhash, lastValidBlockHeight },
                    "confirmed"
                  );
                  console.log("[StartGame] Undelegated:", sigUndelegate);
                }
                break;
              } catch (retryErr) {
                console.warn(`[StartGame] Undelegate attempt ${retry + 1} failed:`, retryErr);
                if (retry === 2) throw retryErr;
                await new Promise(r => setTimeout(r, 2000));
              }
            }

            // Poll L1 until account is no longer delegated
            console.log("[StartGame] Waiting for undelegation to propagate to L1...");
            const maxAttempts = 30;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 1000));
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
            throw undelegateErr;
          }
        }

        // STEP 1: Start game (L1)
        console.log("[StartGame] Starting new game on L1...");
        const tx = await buildStartGameTx(worldPda, WORLD_ID, publicKey, characterId, solanaConnection);

        if (isGuestMode) {
          await signAndSendViaAPI(tx, false);
        } else if (signTransaction) {
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          tx.feePayer = publicKey;
          const signed = await signTransaction(tx);
          const sig = await connection.sendRawTransaction(signed.serialize());
          await connection.confirmTransaction(sig, "confirmed");
          console.log("[StartGame] Started game on L1:", sig);
        }

        // STEP 2: Delegate GameSession to ER (L1)
        console.log("[StartGame] Delegating GameSession to ER...");
        const delegateTx = await buildDelegateSessionTx(worldPda, WORLD_ID, publicKey, solanaConnection);

        if (isGuestMode) {
          await signAndSendViaAPI(delegateTx, false);
        } else if (signTransaction) {
          delegateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          delegateTx.feePayer = publicKey;
          const signedDelegate = await signTransaction(delegateTx);
          const sigDelegate = await connection.sendRawTransaction(signedDelegate.serialize(), { skipPreflight: true });
          await connection.confirmTransaction(sigDelegate, "confirmed");
          console.log("[StartGame] Delegation successful:", sigDelegate);
        }

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
    [publicKey, signTransaction, worldPda, connection, isGuestMode, signAndSendViaAPI]
  );

  // Sync local state to ER (gasless) - uses session keypair for auto-signing
  const syncToER = useCallback(async () => {
    if (!publicKey || !sessionKeypairRef.current || localState.isPaused) return;

    try {
      const sessionKp = sessionKeypairRef.current;

      const tx = await buildUpdateStatsTx(
        worldPda,
        WORLD_ID,
        publicKey,
        sessionKp.publicKey,
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
        erConnection
      );

      tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = sessionKp.publicKey;

      tx.sign(sessionKp);

      await erConnection.sendRawTransaction(tx.serialize(), {
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

    const now = Date.now();
    if (now - lastKillSyncRef.current < 100) return;
    lastKillSyncRef.current = now;

    try {
      const sessionKp = sessionKeypairRef.current;

      const tx = await buildUpdateStatsTx(
        worldPda,
        WORLD_ID,
        publicKey,
        sessionKp.publicKey,
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
        erConnection
      );

      tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
      tx.feePayer = sessionKp.publicKey;

      tx.sign(sessionKp);

      const sig = await erConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });

      console.log("[KillTx] Auto-signed:", sig);
      setTxCount(prev => prev + 1);
    } catch (err) {
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

  // Use revive (L1 transaction) - disabled in guest mode
  const useRevive = useCallback(async () => {
    if (isGuestMode) {
      setError("Revive not available in guest mode");
      return false;
    }

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
  }, [publicKey, signTransaction, worldPda, connection, startSyncLoop, isGuestMode]);

  // End game - calls end_game system to mark session as inactive
  const endGame = useCallback(async () => {
    stopSyncLoop();

    if (!publicKey) {
      setScreen("results");
      return true;
    }

    setLoading(true);

    try {
      // STEP 1: Undelegate GameSession (ER → L1)
      console.log("[EndGame] Undelegating GameSession from ER...");
      try {
        const undelegateTx = await buildUndelegateSessionTx(worldPda, WORLD_ID, publicKey);
        undelegateTx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
        undelegateTx.feePayer = publicKey;

        if (isGuestMode) {
          await signAndSendViaAPI(undelegateTx, true);
        } else if (signTransaction) {
          const signedUndelegate = await signTransaction(undelegateTx);
          const sigUndelegate = await erConnection.sendRawTransaction(signedUndelegate.serialize(), { skipPreflight: true });
          await erConnection.confirmTransaction(sigUndelegate, "confirmed");
          console.log("[EndGame] Undelegated:", sigUndelegate);
        }
      } catch (undelegateErr) {
        console.warn("[EndGame] Undelegate failed (continuing anyway):", undelegateErr);
      }

      // STEP 2: End game (L1) - skip for guest mode (account may still be delegated)
      if (!isGuestMode && signTransaction) {
        const tx = await buildEndGameTx(worldPda, WORLD_ID, publicKey, solanaConnection);
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = publicKey;
        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, "confirmed");
        console.log("[EndGame] End game confirmed:", sig);
      } else {
        console.log("[EndGame] Skipping end_game for guest mode");
      }

      setScreen("results");
      return true;
    } catch (err) {
      console.error("End game error:", err);
      setScreen("results");
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, worldPda, connection, stopSyncLoop, isGuestMode, signAndSendViaAPI]);

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

        if (newState.hp <= 0 && !prev.isDead) {
          onPlayerDeath();
        }

        return newState;
      });
    },
    [onPlayerDeath]
  );

  // Initialize on wallet connect or guest mode
  useEffect(() => {
    const checkAndLoadPlayer = async (pk: PublicKey) => {
      const exists = await checkPlayerExists(connection, WORLD_ID, pk);
      if (exists) {
        // Load player data to get the name
        const data = await fetchPlayerData(connection, WORLD_ID, pk);
        if (data) {
          setPlayerData({ name: data.name } as any);
        }
        setScreen("welcome-back");
      } else {
        setScreen("menu");
      }
    };

    if (isGuestMode && guestServerWallet) {
      checkAndLoadPlayer(guestServerWallet);
    } else if (connected && walletPublicKey) {
      checkAndLoadPlayer(walletPublicKey);
    } else if (!isGuestMode) {
      setScreen("menu");
    }
  }, [connected, walletPublicKey, isGuestMode, guestServerWallet, connection]);

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
    localState,
    selectedCharacter,
    loading,
    error,
    connected: connected || isGuestMode,
    publicKey,
    txCount,
    isGuestMode,
    guestNickname,

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
