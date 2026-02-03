"use client";

import { LocalGameState } from "@/types";
import { useCoins } from "@/contexts/CoinsContext";
import Image from "next/image";

interface Props {
  state: LocalGameState;
  txCount?: number;
}

// Stat icon component
function StatIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={16}
      height={16}
      className="inline-block mr-1"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function GameHUD({ state, txCount = 0 }: Props) {
  const { totalCoins } = useCoins();
  const hpPercent = (state.hp / state.maxHp) * 100;
  const xpForNextLevel = state.level * 100;
  const xpPercent = (state.xp / xpForNextLevel) * 100;

  // Determine HP bar color class
  const hpBarClass = hpPercent > 60
    ? "pixel-bar-hp"
    : hpPercent > 30
    ? "pixel-bar-hp-warning"
    : "pixel-bar-hp-danger";

  return (
    <div className="w-full max-w-[800px] mb-4 space-y-3">
      {/* Vault display - top right */}
      <div className="flex justify-end">
        <div className="vault-display text-[10px]">
          <StatIcon src="/sprites/ui/icon_gold.png" alt="Gold" />
          <span className="stat-value text-xs">{totalCoins}</span>
        </div>
      </div>

      {/* HP and Level row */}
      <div className="rpg-frame p-3">
        <div className="flex items-center gap-4">
          {/* HP Bar */}
          <div className="flex-1">
            <div className="flex justify-between text-[8px] text-[#8a7a6a] mb-1">
              <span className="flex items-center">
                <StatIcon src="/sprites/ui/icon_hp.png" alt="HP" />
                HP
              </span>
              <span className="text-[var(--gold)]">{state.hp} / {state.maxHp}</span>
            </div>
            <div className="pixel-bar-container">
              <div
                className={`pixel-bar-fill ${hpBarClass}`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Level */}
          <div className="text-center px-4 border-l-2 border-[var(--dungeon-border)]">
            <div className="stat-label">LVL</div>
            <div className="rpg-title text-lg">{state.level}</div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[8px] text-[#6a5a4a] mb-1">
            <span>EXP</span>
            <span>{state.xp} / {xpForNextLevel}</span>
          </div>
          <div className="pixel-bar-container h-3">
            <div
              className="pixel-bar-fill pixel-bar-xp"
              style={{ width: `${Math.min(xpPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="rpg-frame p-2">
        <div className="flex justify-between text-[8px]">
          <div className="flex items-center gap-4">
            <span className="flex items-center">
              <StatIcon src="/sprites/ui/icon_gold.png" alt="Gold" />
              <span className="text-[var(--gold)]">{state.gold}</span>
            </span>
            <span className="flex items-center">
              <StatIcon src="/sprites/ui/icon_kills.png" alt="Kills" />
              <span className="text-[var(--blood-light)]">{state.kills}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              <span className="text-[#6a5a4a]">TX</span>{" "}
              <span className="text-[var(--mana-blue)]">{txCount}</span>
            </span>
            <span className="flex items-center">
              <StatIcon src="/sprites/ui/icon_wave.png" alt="Wave" />
              <span className="text-[var(--forest)]">{state.wave}</span>
            </span>
            <span className="flex items-center">
              <StatIcon src="/sprites/ui/icon_time.png" alt="Time" />
              <span className="text-[#9a8a7a]">{state.timeSurvived}s</span>
            </span>
          </div>
        </div>
      </div>

      {/* Paused overlay */}
      {state.isPaused && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-40">
          <div className="rpg-frame rpg-frame-corners p-8">
            <div className="rpg-title text-2xl torch-glow">
              PAUSED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
