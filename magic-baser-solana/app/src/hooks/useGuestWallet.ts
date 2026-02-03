"use client";

import { useCallback } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { useGuest } from "@/contexts/GuestContext";

interface SignAndSendResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export function useGuestWallet() {
  const { isGuestMode, guestKeypair, guestServerWallet } = useGuest();

  // Sign and send transaction via API (L1 transactions)
  const signAndSendTransaction = useCallback(
    async (tx: Transaction, isER = false): Promise<SignAndSendResult> => {
      if (!guestServerWallet) {
        return { success: false, error: "Guest wallet not initialized" };
      }

      try {
        // Serialize transaction (without signature)
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
          return { success: false, error: data.error || "Transaction failed" };
        }

        return { success: true, signature: data.signature };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [guestServerWallet]
  );

  // Get the authority public key for PDA derivation
  // In guest mode, use the server wallet for L1 transactions
  const getAuthority = useCallback((): PublicKey | null => {
    if (!isGuestMode) return null;
    return guestServerWallet;
  }, [isGuestMode, guestServerWallet]);

  return {
    isGuestMode,
    guestKeypair,
    guestServerWallet,
    signAndSendTransaction,
    getAuthority,
  };
}
