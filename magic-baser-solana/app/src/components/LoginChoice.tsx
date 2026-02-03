"use client";

import { useState } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useGuest } from "@/contexts/GuestContext";

interface LoginChoiceProps {
  onGuestStart: (nickname: string) => void;
}

export function LoginChoice({ onGuestStart }: LoginChoiceProps) {
  const { setVisible } = useWalletModal();
  const { enterGuestMode } = useGuest();
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [nickname, setNickname] = useState("");

  const handleGuestPlay = () => {
    if (!nickname.trim()) return;
    enterGuestMode(nickname.trim());
    onGuestStart(nickname.trim());
  };

  if (showGuestForm) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white">Guest Mode</h2>
        <p className="text-gray-400 text-center">
          Play without a wallet. Your progress will be saved locally.
        </p>

        <div className="w-full">
          <label className="block text-gray-400 mb-2">Choose a nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="Enter your nickname..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none text-white"
            onKeyDown={(e) => e.key === "Enter" && handleGuestPlay()}
            autoFocus
          />
        </div>

        <button
          onClick={handleGuestPlay}
          disabled={!nickname.trim()}
          className={`
            w-full px-8 py-4 rounded-lg font-bold text-lg transition-all
            ${!nickname.trim()
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30"
            }
            text-white
          `}
        >
          Start Playing
        </button>

        <button
          onClick={() => setShowGuestForm(false)}
          className="text-gray-500 hover:text-gray-400 transition-colors"
        >
          Back to options
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <button
        onClick={() => setVisible(true)}
        className="w-full px-8 py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all shadow-lg shadow-purple-500/30"
      >
        Connect Wallet
      </button>

      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-sm">or</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      <button
        onClick={() => setShowGuestForm(true)}
        className="w-full px-8 py-4 rounded-lg font-bold text-lg bg-gray-700 hover:bg-gray-600 text-white transition-all border border-gray-600"
      >
        Play as Guest
      </button>

      <p className="text-xs text-gray-600 text-center">
        Guest mode uses a shared wallet for transactions.
        <br />
        Connect your own wallet for the full experience.
      </p>
    </div>
  );
}
