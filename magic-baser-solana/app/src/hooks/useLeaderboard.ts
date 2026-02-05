"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { LeaderboardDisplay } from "@/types";
import { LeaderboardRow } from "@/lib/supabase";

interface UseLeaderboardResult {
  entries: LeaderboardDisplay[];
  playerRank: number | null;
  totalPlayers: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache to prevent excessive fetches
let cachedEntries: LeaderboardDisplay[] = [];
let lastFetchTime = 0;
const CACHE_DURATION_MS = 30000; // 30 seconds cache

export function useLeaderboard(
  playerPubkey?: PublicKey,
  playerName?: string
): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardDisplay[]>(cachedEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;

    // Use cache if recent enough (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && cachedEntries.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      console.log("[useLeaderboard] Using cached data");
      setEntries(cachedEntries);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Fetch from Supabase API
      const response = await fetch('/api/leaderboard');
      const { entries: rawEntries, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // Convert to LeaderboardDisplay format and add ranking
      const playerWallet = playerPubkey?.toBase58();
      const ranked: LeaderboardDisplay[] = (rawEntries || []).map(
        (row: LeaderboardRow, index: number) => ({
          rank: index + 1,
          name: row.name || 'Anonymous',
          walletAddress: row.wallet_address,
          bestTime: row.best_time,
          bestWave: row.best_wave,
          totalGold: Number(row.total_gold),
          gamesPlayed: row.games_played,
          isCurrentPlayer: playerWallet === row.wallet_address,
          characterId: row.character_id || 'imelda',
        })
      );

      // Override name for current player with the provided playerName
      // This ensures guest mode users see their own name correctly
      let finalEntries = ranked;
      if (playerName) {
        finalEntries = ranked.map((entry) => ({
          ...entry,
          name: entry.isCurrentPlayer ? playerName : entry.name,
        }));
      }

      // Update cache
      cachedEntries = finalEntries;
      lastFetchTime = Date.now();

      setEntries(finalEntries);
    } catch (err) {
      console.error("[useLeaderboard] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [playerPubkey, playerName]);

  // Auto-fetch on mount only (not on every dependency change)
  useEffect(() => {
    fetchLeaderboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find current player's rank
  const playerRank = entries.find((e) => e.isCurrentPlayer)?.rank ?? null;

  return {
    entries,
    playerRank,
    totalPlayers: entries.length,
    loading,
    error,
    refetch: () => fetchLeaderboard(true),
  };
}
