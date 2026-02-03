"use client";

import { LocalGameState } from "@/types";

interface Props {
  state: LocalGameState;
  revivesAvailable: number;
  onRevive: () => void;
  onEndGame: () => void;
  loading: boolean;
  isGuestMode?: boolean;
}

export function DeathScreen({
  state,
  revivesAvailable,
  onRevive,
  onEndGame,
  loading,
  isGuestMode = false,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-2 border-red-500 rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-4xl font-bold text-red-500 mb-4">YOU DIED</h2>

        <div className="space-y-2 mb-6 text-gray-300">
          <p>
            Wave: <span className="text-white font-bold">{state.wave}</span>
          </p>
          <p>
            Time:{" "}
            <span className="text-white font-bold">{state.timeSurvived}s</span>
          </p>
          <p>
            Kills: <span className="text-white font-bold">{state.kills}</span>
          </p>
          <p>
            Gold Earned:{" "}
            <span className="text-yellow-500 font-bold">{state.gold}</span>
          </p>
          <p>
            XP Gained:{" "}
            <span className="text-green-500 font-bold">{state.xp}</span>
          </p>
        </div>

        <div className="space-y-3">
          {isGuestMode ? (
            <div className="text-gray-500 py-2">Revive not available in guest mode</div>
          ) : revivesAvailable > 0 ? (
            <button
              onClick={onRevive}
              disabled={loading}
              className={`
                w-full px-6 py-3 rounded-lg font-bold transition-all
                ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                }
                text-white
              `}
            >
              {loading ? "Reviving..." : `Revive (${revivesAvailable} left)`}
            </button>
          ) : (
            <div className="text-gray-500 py-2">No revives available</div>
          )}

          <button
            onClick={onEndGame}
            disabled={loading}
            className={`
              w-full px-6 py-3 rounded-lg font-bold transition-all
              ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gray-700 hover:bg-gray-600"
              }
              text-white
            `}
          >
            End Game
          </button>
        </div>

        {!isGuestMode && (
          <p className="text-xs text-gray-500 mt-4">
            Revive costs ~0.00001 SOL (L1 transaction)
          </p>
        )}
      </div>
    </div>
  );
}
