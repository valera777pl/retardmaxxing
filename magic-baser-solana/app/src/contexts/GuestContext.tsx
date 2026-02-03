"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";

interface GuestContextType {
  isGuestMode: boolean;
  guestKeypair: Keypair | null;
  guestServerWallet: PublicKey | null;
  nickname: string;
  enterGuestMode: (nickname: string) => void;
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = "magic-baser-guest";

interface StoredGuestData {
  nickname: string;
  keypairSecret: number[];
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestKeypair, setGuestKeypair] = useState<Keypair | null>(null);
  const [guestServerWallet, setGuestServerWallet] = useState<PublicKey | null>(null);
  const [nickname, setNickname] = useState("");

  // Fetch server wallet on mount
  useEffect(() => {
    async function fetchServerWallet() {
      try {
        const res = await fetch("/api/guest/sign-transaction");
        const data = await res.json();
        if (data.publicKey) {
          setGuestServerWallet(new PublicKey(data.publicKey));
        }
      } catch (error) {
        console.error("Failed to fetch guest server wallet:", error);
      }
    }
    fetchServerWallet();
  }, []);

  // Load guest data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (stored) {
        const data: StoredGuestData = JSON.parse(stored);
        const keypair = Keypair.fromSecretKey(Uint8Array.from(data.keypairSecret));
        setGuestKeypair(keypair);
        setNickname(data.nickname);
        setIsGuestMode(true);
      }
    } catch (error) {
      console.error("Failed to load guest data:", error);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  }, []);

  const enterGuestMode = useCallback((name: string) => {
    // Generate new keypair for entity derivation (PDA seeds)
    const keypair = Keypair.generate();

    // Store in localStorage for persistence
    const data: StoredGuestData = {
      nickname: name,
      keypairSecret: Array.from(keypair.secretKey),
    };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));

    setGuestKeypair(keypair);
    setNickname(name);
    setIsGuestMode(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setGuestKeypair(null);
    setNickname("");
    setIsGuestMode(false);
  }, []);

  return (
    <GuestContext.Provider
      value={{
        isGuestMode,
        guestKeypair,
        guestServerWallet,
        nickname,
        enterGuestMode,
        exitGuestMode,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
}
