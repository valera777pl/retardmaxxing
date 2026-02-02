"use client";

import { LocalGameState } from "@/types";

interface Props {
  state: LocalGameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function ResultsScreen({ state, onPlayAgain, onMainMenu }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 p-8 max-w-lg mx-auto">
      <h2 className="text-4xl font-bold text-white">Game Over</h2>

      <div className="w-full bg-gray-800/50 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2">
          Final Stats
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <StatBox label="Wave Reached" value={state.wave} color="purple" />
          <StatBox
            label="Time Survived"
            value={`${state.timeSurvived}s`}
            color="blue"
          />
          <StatBox label="Total Kills" value={state.kills} color="red" />
          <StatBox label="Final Level" value={state.level} color="green" />
          <StatBox
            label="Gold Earned"
            value={state.gold}
            color="yellow"
            icon="💰"
          />
          <StatBox
            label="XP Gained"
            value={state.xp}
            color="emerald"
            icon="✨"
          />
        </div>
      </div>

      <div className="w-full bg-gray-800/30 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-sm">
          Stats committed to Solana blockchain ✓
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Your progress has been saved permanently on-chain
        </p>
      </div>

      <div className="flex gap-4 w-full">
        <button
          onClick={onPlayAgain}
          className="flex-1 px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all"
        >
          Play Again
        </button>
        <button
          onClick={onMainMenu}
          className="flex-1 px-6 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
        >
          Main Menu
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
  icon?: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: "text-purple-400",
    blue: "text-blue-400",
    red: "text-red-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 text-center">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </p>
    </div>
  );
}
