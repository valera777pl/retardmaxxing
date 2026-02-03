"use client";

import { useState, useEffect } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useGuest } from "@/contexts/GuestContext";
import { getPlayerNickname, setPlayerNickname } from "@/utils/cookies";

interface LoginChoiceProps {
  onGuestStart: (nickname: string) => void;
}

export function LoginChoice({ onGuestStart }: LoginChoiceProps) {
  const { setVisible } = useWalletModal();
  const { enterGuestMode } = useGuest();
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [nickname, setNickname] = useState("");

  // Load saved nickname from cookies on mount
  useEffect(() => {
    const savedNickname = getPlayerNickname();
    if (savedNickname) {
      setNickname(savedNickname);
    }
  }, []);

  const handleGuestPlay = () => {
    if (!nickname.trim()) return;
    const trimmedName = nickname.trim();
    // Save nickname to cookies
    setPlayerNickname(trimmedName);
    enterGuestMode(trimmedName);
    onGuestStart(trimmedName);
  };

  if (showGuestForm) {
    return (
      <div className="screen-enter flex flex-col items-center gap-6 w-full max-w-md">
        {/* Torch decorations */}
        <div className="flex justify-between w-full px-4 mb-2">
          <span className="torch-glow text-2xl">🔥</span>
          <span className="torch-glow text-2xl">🔥</span>
        </div>

        <div className="rpg-frame rpg-frame-corners p-8 w-full">
          <h2 className="rpg-title text-xl text-center mb-6">CHOOSE THY NAME</h2>

          <div className="w-full mb-6">
            <label className="stat-label block mb-3">ADVENTURER NAME</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              placeholder="Enter name..."
              maxLength={20}
              className="pixel-input w-full"
              onKeyDown={(e) => e.key === "Enter" && handleGuestPlay()}
              autoFocus
            />
          </div>

          <button
            onClick={handleGuestPlay}
            disabled={!nickname.trim()}
            className={`pixel-btn w-full ${nickname.trim() ? "pixel-btn-success" : ""}`}
          >
            {nickname.trim() ? "BEGIN QUEST" : "ENTER NAME..."}
          </button>
        </div>

        <button
          onClick={() => setShowGuestForm(false)}
          className="pixel-btn text-xs"
        >
          ← RETURN
        </button>
      </div>
    );
  }

  return (
    <div className="screen-enter flex flex-col items-center gap-6 w-full max-w-md">
      {/* Torch decorations */}
      <div className="flex justify-between w-full px-4 mb-2">
        <span className="torch-glow text-2xl">🔥</span>
        <span className="torch-glow text-2xl">🔥</span>
      </div>

      <div className="rpg-frame rpg-frame-corners p-8 w-full">
        <h2 className="rpg-title text-xl text-center mb-8">SELECT THY PATH</h2>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => setVisible(true)}
            className="pixel-btn pixel-btn-primary w-full"
          >
            CONNECT WALLET
          </button>

          <div className="divider-ornate text-xs py-2">
            <span className="text-[var(--gold-dark)]">OR</span>
          </div>

          <button
            onClick={() => setShowGuestForm(true)}
            className="pixel-btn w-full"
          >
            PLAY AS GUEST
          </button>
        </div>
      </div>

      <p className="text-[10px] text-[#6a5a4a] text-center leading-relaxed mt-4">
        GUEST MODE USES A SHARED WALLET
        <br />
        CONNECT THY OWN FOR FULL GLORY
      </p>
    </div>
  );
}
