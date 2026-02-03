"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  getTotalCoins,
  setTotalCoins,
  addCoins as addCoinsToCookie,
  spendCoins as spendCoinsFromCookie,
} from "@/utils/cookies";

const UNLOCKED_CHARACTERS_KEY = "magic-baser-unlocked-characters";
const DEFAULT_UNLOCKED = ["imelda"]; // Starter character is always unlocked

interface CoinsContextType {
  totalCoins: number;
  unlockedCharacters: string[];
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  unlockCharacter: (characterId: string, cost: number) => boolean;
  isCharacterUnlocked: (characterId: string) => boolean;
  refreshCoins: () => void;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function CoinsProvider({ children }: { children: ReactNode }) {
  const [totalCoins, setTotalCoinsState] = useState(0);
  const [unlockedCharacters, setUnlockedCharacters] = useState<string[]>(DEFAULT_UNLOCKED);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from storage on mount
  useEffect(() => {
    // Load coins from cookies
    const coins = getTotalCoins();
    setTotalCoinsState(coins);

    // Load unlocked characters from localStorage
    try {
      const stored = localStorage.getItem(UNLOCKED_CHARACTERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Ensure default characters are always included
          const merged = [...new Set([...DEFAULT_UNLOCKED, ...parsed])];
          setUnlockedCharacters(merged);
        }
      }
    } catch (error) {
      console.error("Failed to load unlocked characters:", error);
    }

    setIsInitialized(true);
  }, []);

  // Save unlocked characters to localStorage when changed
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(UNLOCKED_CHARACTERS_KEY, JSON.stringify(unlockedCharacters));
    }
  }, [unlockedCharacters, isInitialized]);

  const refreshCoins = useCallback(() => {
    const coins = getTotalCoins();
    setTotalCoinsState(coins);
  }, []);

  const addCoins = useCallback((amount: number) => {
    const newTotal = addCoinsToCookie(amount);
    setTotalCoinsState(newTotal);
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    const success = spendCoinsFromCookie(amount);
    if (success) {
      setTotalCoinsState(getTotalCoins());
    }
    return success;
  }, []);

  const unlockCharacter = useCallback((characterId: string, cost: number): boolean => {
    // Check if already unlocked
    if (unlockedCharacters.includes(characterId)) {
      return true;
    }

    // Try to spend coins
    const success = spendCoinsFromCookie(cost);
    if (success) {
      setTotalCoinsState(getTotalCoins());
      setUnlockedCharacters((prev) => [...prev, characterId]);
      return true;
    }

    return false;
  }, [unlockedCharacters]);

  const isCharacterUnlocked = useCallback((characterId: string): boolean => {
    return unlockedCharacters.includes(characterId);
  }, [unlockedCharacters]);

  return (
    <CoinsContext.Provider
      value={{
        totalCoins,
        unlockedCharacters,
        addCoins,
        spendCoins,
        unlockCharacter,
        isCharacterUnlocked,
        refreshCoins,
      }}
    >
      {children}
    </CoinsContext.Provider>
  );
}

export function useCoins() {
  const context = useContext(CoinsContext);
  if (!context) {
    throw new Error("useCoins must be used within a CoinsProvider");
  }
  return context;
}
