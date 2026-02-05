"use client";

import { LeaderboardDisplay } from "@/types";
import { CHARACTERS } from "@/solana/constants";
import Image from "next/image";

interface Props {
  entries: LeaderboardDisplay[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

// Format time as M:SS with sanity check
function formatTime(seconds: number): string {
  // Sanity check - max reasonable time is 24 hours (86400 seconds)
  if (seconds > 86400 || seconds < 0 || !Number.isFinite(seconds)) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Medal component for top 3
function MedalBadge({ rank }: { rank: number }) {
  const medals: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "1ST", color: "var(--gold)", bg: "rgba(255, 215, 0, 0.2)" },
    2: { label: "2ND", color: "#C0C0C0", bg: "rgba(192, 192, 192, 0.2)" },
    3: { label: "3RD", color: "#CD7F32", bg: "rgba(205, 127, 50, 0.2)" },
  };

  const medal = medals[rank];
  if (!medal) {
    return (
      <span className="text-[11px] text-[#6a5a4a] font-mono">
        #{rank}
      </span>
    );
  }

  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded"
      style={{
        color: medal.color,
        backgroundColor: medal.bg,
        textShadow: "1px 1px 0 #1a1612",
      }}
    >
      {medal.label}
    </span>
  );
}

export function Leaderboard({ entries, loading, error, onClose, onRefresh }: Props) {
  return (
    <div className="screen-enter flex flex-col items-center gap-4 p-4 max-w-4xl mx-auto w-full">
      {/* Header with torches */}
      <div className="flex justify-between w-full px-4">
        <span className="torch-glow text-2xl">🔥</span>
        <span className="torch-glow text-2xl">🔥</span>
      </div>

      <h2 className="rpg-title text-xl text-center">HALL OF CHAMPIONS</h2>

      <div className="rpg-frame rpg-frame-corners p-4 w-full max-h-[65vh] overflow-hidden flex flex-col">
        <div className="divider-ornate text-[8px] mb-4">
          <span className="text-[var(--gold-dark)]">TOP ADVENTURERS</span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="dungeon-spinner" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <p className="text-[var(--blood-light)] text-[10px] mb-4">{error}</p>
            <button onClick={onRefresh} className="pixel-btn text-[10px]">
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#6a5a4a] text-[10px]">NO CHAMPIONS YET</p>
            <p className="text-[#5a4a3a] text-[8px] mt-2">BE THE FIRST TO CLAIM GLORY!</p>
          </div>
        )}

        {/* Leaderboard table */}
        {!loading && !error && entries.length > 0 && (
          <div className="overflow-y-auto leaderboard-scroll flex-1">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[var(--dungeon-panel)] z-10">
                <tr className="text-[#8a7a6a] border-b-2 border-[var(--dungeon-border)]">
                  <th className="py-3 px-3 text-left w-16">RANK</th>
                  <th className="py-3 px-3 text-left">NAME</th>
                  <th className="py-3 px-3 text-center w-16">
                    <div className="flex items-center justify-center gap-1">
                      <Image
                        src="/sprites/ui/icon_wave.png"
                        alt="Wave"
                        width={12}
                        height={12}
                        style={{ imageRendering: 'pixelated' }}
                      />
                      WAVE
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-20">
                    <div className="flex items-center justify-center gap-1">
                      <Image
                        src="/sprites/ui/icon_time.png"
                        alt="Time"
                        width={12}
                        height={12}
                        style={{ imageRendering: 'pixelated' }}
                      />
                      TIME
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <Image
                        src="/sprites/ui/icon_gold.png"
                        alt="Gold"
                        width={12}
                        height={12}
                        style={{ imageRendering: 'pixelated' }}
                      />
                      GOLD
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-20">
                    <span className="text-[10px]">GAMES</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`border-b border-[var(--dungeon-border)]/50 transition-colors ${
                      entry.isCurrentPlayer
                        ? "bg-[var(--gold)]/15 leaderboard-highlight"
                        : "hover:bg-[var(--dungeon-border)]/20"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <MedalBadge rank={entry.rank} />
                    </td>
                    <td className={`py-3 px-3 ${
                      entry.isCurrentPlayer ? "text-[var(--gold)] font-bold" : "text-[var(--foreground)]"
                    }`}>
                      <div className="flex items-center gap-2">
                        {entry.characterId && CHARACTERS[entry.characterId as keyof typeof CHARACTERS] ? (
                          <Image
                            src={CHARACTERS[entry.characterId as keyof typeof CHARACTERS].sprite}
                            alt={entry.characterId}
                            width={20}
                            height={20}
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="w-5 h-5 bg-[var(--dungeon-border)] rounded" />
                        )}
                        <span className="truncate max-w-[120px]">{entry.name}</span>
                        {entry.isCurrentPlayer && (
                          <span className="text-[9px] text-[var(--gold-dark)] bg-[var(--gold)]/20 px-1.5 py-0.5 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[var(--gold)] font-bold text-[12px]">
                        {entry.bestWave}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[var(--mana-blue)] font-mono">
                        {formatTime(entry.bestTime)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[var(--gold)]">
                        {entry.totalGold.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[#8a7a6a]">
                        {entry.gamesPlayed}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats summary */}
      {!loading && !error && entries.length > 0 && (
        <div className="flex gap-6 text-[9px] text-[#6a5a4a]">
          <span>TOTAL PLAYERS: <span className="text-[var(--gold)]">{entries.length}</span></span>
          <span>TOP WAVE: <span className="text-[var(--gold)]">{entries[0]?.bestWave || 0}</span></span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 w-full max-w-md">
        <button onClick={onRefresh} disabled={loading} className="pixel-btn flex-1 text-[10px]">
          {loading ? "LOADING..." : "REFRESH"}
        </button>
        <button onClick={onClose} className="pixel-btn pixel-btn-primary flex-1">
          RETURN
        </button>
      </div>

      {/* Footer */}
      <p className="text-[7px] text-[#4a3a2a]">
        RANKINGS STORED ON SOLANA BLOCKCHAIN
      </p>
    </div>
  );
}
