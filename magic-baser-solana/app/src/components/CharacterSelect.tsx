"use client";

import { CHARACTERS, CharacterId } from "@/solana/constants";

interface Props {
  selectedCharacter: CharacterId;
  onSelect: (id: CharacterId) => void;
  onStart: () => void;
  loading: boolean;
  ownedCharacters?: string[];
}

export function CharacterSelect({
  selectedCharacter,
  onSelect,
  onStart,
  loading,
  ownedCharacters = ["imelda"],
}: Props) {
  const characters = Object.entries(CHARACTERS) as [
    CharacterId,
    (typeof CHARACTERS)[CharacterId]
  ][];

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h2 className="text-3xl font-bold text-white">Select Character</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {characters.map(([id, char]) => {
          const owned = ownedCharacters.includes(id);
          const selected = selectedCharacter === id;

          return (
            <button
              key={id}
              onClick={() => owned && onSelect(id)}
              disabled={!owned}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  selected
                    ? "border-purple-500 bg-purple-500/20"
                    : owned
                    ? "border-gray-600 hover:border-purple-400 bg-gray-800/50"
                    : "border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed"
                }
              `}
            >
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">
                  {id === "imelda" && "🧙‍♀️"}
                  {id === "antonio" && "🛡️"}
                  {id === "pasqualina" && "⚡"}
                  {id === "gennaro" && "⚔️"}
                  {id === "mortaccio" && "💀"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{char.name}</h3>
              <p className="text-sm text-gray-400">HP: {char.hp}</p>
              <p className="text-xs text-gray-500">{char.description}</p>
              {!owned && (
                <span className="text-xs text-yellow-500 mt-2 block">
                  🔒 Locked
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onStart}
        disabled={loading}
        className={`
          px-8 py-3 rounded-lg font-bold text-lg transition-all
          ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          }
          text-white shadow-lg shadow-purple-500/30
        `}
      >
        {loading ? "Starting..." : "Start Game"}
      </button>
    </div>
  );
}
