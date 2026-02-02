"use client";

import { LocalGameState } from "@/types";

interface Props {
  state: LocalGameState;
  txCount?: number;
}

export function GameHUD({ state, txCount = 0 }: Props) {
  const hpPercent = (state.hp / state.maxHp) * 100;
  const xpForNextLevel = state.level * 100;
  const xpPercent = (state.xp / xpForNextLevel) * 100;

  return (
    <div className="w-full max-w-[800px] mb-4 space-y-2">
      {/* Top row - HP and Level */}
      <div className="flex items-center gap-4">
        {/* HP Bar */}
        <div className="flex-1">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>HP</span>
            <span>{state.hp} / {state.maxHp}</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                hpPercent > 60
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : hpPercent > 30
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-gradient-to-r from-red-500 to-rose-500"
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Level */}
        <div className="text-center px-4">
          <div className="text-2xl font-bold text-purple-400">Lv.{state.level}</div>
        </div>
      </div>

      {/* XP Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>XP</span>
          <span>{state.xp} / {xpForNextLevel}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
            style={{ width: `${Math.min(xpPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-yellow-500">
            <span className="opacity-70">Gold:</span> {state.gold}
          </span>
          <span className="text-red-500">
            <span className="opacity-70">Kills:</span> {state.kills}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-semibold">
            <span className="opacity-70">MagicBlock Txs:</span> {txCount}
          </span>
          <span className="text-blue-400">
            <span className="opacity-70">Wave:</span> {state.wave}
          </span>
          <span className="text-gray-400">
            <span className="opacity-70">Time:</span> {state.timeSurvived}s
          </span>
        </div>
      </div>

      {/* Paused indicator */}
      {state.isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40">
          <div className="text-4xl font-bold text-white animate-pulse">
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
}
