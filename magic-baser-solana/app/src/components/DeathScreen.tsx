"use client";

import { LocalGameState } from "@/types";
import { shareToTwitter } from "@/utils/share";
import Image from "next/image";

interface Props {
  state: LocalGameState;
  revivesAvailable: number;
  onRevive: () => void;
  onEndGame: () => void;
  loading: boolean;
  isGuestMode?: boolean;
  playerRank?: number | null;
  totalPlayers?: number;
}

// Stat icon component
function StatIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={12}
      height={12}
      className="inline-block mr-1"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function DeathScreen({
  state,
  revivesAvailable,
  onRevive,
  onEndGame,
  loading,
  isGuestMode = false,
  playerRank,
  totalPlayers,
}: Props) {
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

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="screen-enter rpg-frame rpg-frame-corners p-8 max-w-md w-full text-center">
        {/* Skull decoration */}
        <div className="skull-decoration mx-auto mb-4">
          <span>💀</span>
        </div>

        <h2 className="rpg-title text-xl mb-2 text-[var(--blood-light)]">
          THOU HAST FALLEN
        </h2>

        <p className="text-[8px] text-[#6a5a4a] mb-6">
          THE DARKNESS CLAIMS ANOTHER SOUL
        </p>

        {/* Stats */}
        <div className="space-y-2 mb-6">
          <div className="divider-ornate text-[8px]">
            <span className="text-[var(--gold-dark)]">FINAL TALLY</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rpg-frame p-2">
              <div className="stat-label flex items-center justify-center">
                <StatIcon src="/sprites/ui/icon_wave.png" alt="Wave" />
                WAVE
              </div>
              <div className="text-[var(--gold)] text-sm">{state.wave}</div>
            </div>
            <div className="rpg-frame p-2">
              <div className="stat-label flex items-center justify-center">
                <StatIcon src="/sprites/ui/icon_time.png" alt="Time" />
                TIME
              </div>
              <div className="text-[var(--mana-blue)] text-sm">{state.timeSurvived}s</div>
            </div>
            <div className="rpg-frame p-2">
              <div className="stat-label flex items-center justify-center">
                <StatIcon src="/sprites/ui/icon_kills.png" alt="Kills" />
                KILLS
              </div>
              <div className="text-[var(--blood-light)] text-sm">{state.kills}</div>
            </div>
            <div className="rpg-frame p-2">
              <div className="stat-label flex items-center justify-center">
                <StatIcon src="/sprites/ui/icon_gold.png" alt="Gold" />
                GOLD
              </div>
              <div className="text-[var(--gold)] text-sm">{state.gold}</div>
            </div>
          </div>

          <div className="rpg-frame p-2">
            <div className="stat-label">EXP GAINED</div>
            <div className="text-[var(--xp-purple)] text-sm">{state.xp}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isGuestMode ? (
            <div className="text-[8px] text-[#5a4a3a] py-2">
              REVIVE NOT AVAILABLE IN GUEST MODE
            </div>
          ) : revivesAvailable > 0 ? (
            <button
              onClick={onRevive}
              disabled={loading}
              className="pixel-btn pixel-btn-success w-full"
            >
              {loading ? "REVIVING..." : `RISE AGAIN (${revivesAvailable} LEFT)`}
            </button>
          ) : (
            <div className="text-[8px] text-[#5a4a3a] py-2">
              NO REVIVES REMAIN
            </div>
          )}

          <button
            onClick={handleShare}
            disabled={loading}
            className="pixel-btn w-full text-[10px]"
          >
            SHARE DEFEAT TO X
          </button>

          <button
            onClick={onEndGame}
            disabled={loading}
            className="pixel-btn pixel-btn-danger w-full"
          >
            ACCEPT FATE
          </button>
        </div>

        {!isGuestMode && (
          <p className="text-[7px] text-[#4a3a2a] mt-4">
            REVIVE COSTS ~0.00001 SOL (L1 TRANSACTION)
          </p>
        )}
      </div>
    </div>
  );
}
