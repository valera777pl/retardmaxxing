"use client";

import { useEffect, useState } from "react";
import { LocalGameState } from "@/types";
import { useCoins } from "@/contexts/CoinsContext";
import { shareToTwitter } from "@/utils/share";
import Image from "next/image";

interface Props {
  state: LocalGameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onShowLeaderboard: () => void;
  playerRank?: number | null;
  totalPlayers?: number;
}

// Stat icon component
function StatIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={16}
      height={16}
      className="inline-block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function ResultsScreen({
  state,
  onPlayAgain,
  onMainMenu,
  onShowLeaderboard,
  playerRank,
  totalPlayers,
}: Props) {
  const { addCoins, totalCoins } = useCoins();
  const [coinsAdded, setCoinsAdded] = useState(false);
  const [showCoinAnim, setShowCoinAnim] = useState(false);

  const handleShare = () => {
    shareToTwitter({
      wave: state.wave,
      timeSurvived: state.timeSurvived,
      kills: state.kills,
      gold: state.gold,
      rank: playerRank ?? undefined,
      totalPlayers: totalPlayers,
    });
  };

  // Add earned coins to vault on mount
  useEffect(() => {
    if (!coinsAdded && state.gold > 0) {
      // Delay for dramatic effect
      const timer = setTimeout(() => {
        addCoins(state.gold);
        setCoinsAdded(true);
        setShowCoinAnim(true);

        // Hide animation after it completes
        setTimeout(() => setShowCoinAnim(false), 1500);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state.gold, coinsAdded, addCoins]);

  return (
    <div className="screen-enter flex flex-col items-center gap-6 p-4 max-w-lg mx-auto">
      {/* Torch decorations */}
      <div className="flex justify-between w-full px-8">
        <span className="torch-glow text-2xl">🔥</span>
        <span className="torch-glow text-2xl">🔥</span>
      </div>

      <h2 className="rpg-title text-xl text-center">QUEST COMPLETE</h2>

      <div className="rpg-frame rpg-frame-corners p-6 w-full">
        <div className="divider-ornate text-[8px] mb-4">
          <span className="text-[var(--gold-dark)]">FINAL STATS</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBox
            label="WAVE"
            value={state.wave}
            color="gold"
            icon="/sprites/ui/icon_wave.png"
          />
          <StatBox
            label="TIME"
            value={`${state.timeSurvived}s`}
            color="blue"
            icon="/sprites/ui/icon_time.png"
          />
          <StatBox
            label="KILLS"
            value={state.kills}
            color="red"
            icon="/sprites/ui/icon_kills.png"
          />
          <StatBox
            label="LEVEL"
            value={state.level}
            color="green"
            icon="/sprites/ui/icon_damage.png"
          />
        </div>

        {/* Gold earned - special highlight */}
        <div className="rpg-frame p-4 text-center relative overflow-hidden">
          <div className="stat-label mb-2">GOLD EARNED</div>
          <div className="flex items-center justify-center gap-3">
            <StatIcon src="/sprites/ui/icon_gold.png" alt="Gold" />
            <span className="rpg-title text-2xl">{state.gold}</span>
          </div>

          {/* Coin collect animation */}
          {showCoinAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="coin-collect-anim text-4xl">🪙</span>
            </div>
          )}
        </div>

        <div className="divider-ornate text-[8px] my-4">
          <span className="text-[var(--gold-dark)]">EXP GAINED</span>
        </div>

        <div className="rpg-frame p-3 text-center">
          <span className="text-[var(--xp-purple)] text-lg">{state.xp}</span>
          <span className="text-[8px] text-[#6a5a4a] ml-2">EXP</span>
        </div>

        {/* Rank display */}
        {playerRank && totalPlayers && (
          <>
            <div className="divider-ornate text-[8px] my-4">
              <span className="text-[var(--gold-dark)]">GLOBAL RANK</span>
            </div>
            <div className="rpg-frame p-4 text-center">
              <span className="rpg-title text-2xl">#{playerRank}</span>
              <span className="text-[10px] text-[#6a5a4a] ml-2">of {totalPlayers}</span>
            </div>
          </>
        )}
      </div>

      {/* Share and Leaderboard buttons */}
      <div className="flex gap-4 w-full">
        <button
          onClick={handleShare}
          className="pixel-btn pixel-btn-success flex-1 text-[10px]"
        >
          SHARE TO X
        </button>
        <button
          onClick={onShowLeaderboard}
          className="pixel-btn flex-1 text-[10px]"
        >
          LEADERBOARD
        </button>
      </div>

      {/* Vault display */}
      <div className="vault-display">
        <Image
          src="/sprites/ui/icon_gold.png"
          alt="Gold"
          width={20}
          height={20}
          style={{ imageRendering: 'pixelated' }}
        />
        <span className="stat-value">{totalCoins}</span>
        <span className="stat-label ml-2">TOTAL VAULT</span>
      </div>

      {/* Blockchain confirmation */}
      <div className="rpg-frame p-3 text-center w-full">
        <p className="text-[8px] text-[var(--forest)]">
          ✓ STATS COMMITTED TO SOLANA
        </p>
        <p className="text-[7px] text-[#5a4a3a] mt-1">
          THY PROGRESS SAVED ETERNALLY ON-CHAIN
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 w-full">
        <button
          onClick={onPlayAgain}
          className="pixel-btn pixel-btn-primary flex-1"
        >
          VENTURE FORTH
        </button>
        <button
          onClick={onMainMenu}
          className="pixel-btn flex-1"
        >
          RETURN
        </button>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  const colorClasses: Record<string, string> = {
    gold: "text-[var(--gold)]",
    blue: "text-[var(--mana-blue)]",
    red: "text-[var(--blood-light)]",
    green: "text-[var(--forest)]",
    purple: "text-[var(--xp-purple)]",
  };

  return (
    <div className="rpg-frame p-3 text-center">
      <div className="stat-label flex items-center justify-center gap-1">
        <Image
          src={icon}
          alt={label}
          width={12}
          height={12}
          style={{ imageRendering: 'pixelated' }}
        />
        {label}
      </div>
      <div className={`text-lg ${colorClasses[color] || "text-[var(--gold)]"}`}>
        {value}
      </div>
    </div>
  );
}
