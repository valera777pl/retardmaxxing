"use client";

import { useState } from "react";
import { CHARACTERS, CharacterId, TIER_INFO, CharacterTier } from "@/solana/constants";
import { useCoins } from "@/contexts/CoinsContext";
import Image from "next/image";

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
}: Props) {
  const { totalCoins, isCharacterUnlocked, unlockCharacter } = useCoins();
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState<CharacterId | null>(null);

  const characters = Object.entries(CHARACTERS) as [
    CharacterId,
    (typeof CHARACTERS)[CharacterId]
  ][];

  const handleCharacterClick = (id: CharacterId) => {
    const char = CHARACTERS[id];
    const unlocked = isCharacterUnlocked(id);

    if (unlocked) {
      onSelect(id);
    } else if (char.price > 0) {
      setPendingUnlock(id);
      setShowUnlockModal(true);
    }
  };

  const handleUnlock = () => {
    if (!pendingUnlock) return;

    const char = CHARACTERS[pendingUnlock];
    const success = unlockCharacter(pendingUnlock, char.price);

    if (success) {
      onSelect(pendingUnlock);
      setShowUnlockModal(false);
      setPendingUnlock(null);
    }
  };

  const pendingChar = pendingUnlock ? CHARACTERS[pendingUnlock] : null;
  const canAfford = pendingChar ? totalCoins >= pendingChar.price : false;

  return (
    <div className="screen-enter flex flex-col items-center gap-6 p-4 max-w-4xl mx-auto">
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
        <span className="stat-label ml-2">VAULT</span>
      </div>

      <h2 className="rpg-title text-lg md:text-xl text-center">CHOOSE THY CHAMPION</h2>

      {/* Character grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
        {characters.map(([id, char]) => {
          const unlocked = isCharacterUnlocked(id);
          const selected = selectedCharacter === id;
          const tierInfo = TIER_INFO[char.tier as CharacterTier];

          return (
            <button
              key={id}
              onClick={() => handleCharacterClick(id)}
              className={`
                character-card
                ${selected ? "selected" : ""}
                ${!unlocked ? "locked" : ""}
              `}
            >
              {/* Tier badge */}
              <div className={`tier-badge ${tierInfo.color} absolute -top-2 -right-2 z-10`}>
                {tierInfo.label}
              </div>

              {/* Character sprite (64x64 scaled up from 32x32) */}
              <div className="flex justify-center mb-2">
                <Image
                  src={char.sprite}
                  alt={char.name}
                  width={64}
                  height={64}
                  className="pixelated"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Name */}
              <h3 className="text-[10px] text-[var(--gold)] mb-2">{char.name}</h3>

              {/* Stats */}
              <div className="space-y-1 text-[8px]">
                <div className="flex justify-between">
                  <span className="text-[#8a7a6a]">HP</span>
                  <span className="text-[var(--hp-green)]">{char.hp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a7a6a]">SPD</span>
                  <span className="text-[var(--mana-blue)]">{char.speed.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a7a6a]">DMG</span>
                  <span className="text-[var(--blood-light)]">{char.damage.toFixed(1)}x</span>
                </div>
              </div>

              {/* Passive ability */}
              <div className="mt-2 pt-2 border-t border-[var(--dungeon-border)]">
                <div
                  className="text-[7px] font-bold"
                  style={{ color: char.passive.color }}
                >
                  {char.passive.name}
                </div>
                <p className="text-[6px] text-[#6a5a4a] mt-1">{char.passive.description}</p>
              </div>

              {/* Locked overlay */}
              {!unlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
                  <span className="text-xl mb-1">🔒</span>
                  <span className="text-[10px] text-[var(--gold)]">{char.price}</span>
                  <Image
                    src="/sprites/ui/icon_gold.png"
                    alt="Gold"
                    width={16}
                    height={16}
                    className="mt-1"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={loading}
        className={`pixel-btn ${loading ? "" : "pixel-btn-primary"} px-12 py-4 text-sm`}
      >
        {loading ? "PREPARING..." : "BEGIN HUNT"}
      </button>

      {/* Unlock modal */}
      {showUnlockModal && pendingChar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="rpg-frame rpg-frame-corners p-8 max-w-sm w-full screen-enter">
            <h3 className="rpg-title text-sm text-center mb-6">UNLOCK CHAMPION?</h3>

            <div className="text-center mb-6">
              <Image
                src={pendingChar.sprite}
                alt={pendingChar.name}
                width={96}
                height={96}
                className="mx-auto mb-2"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-[var(--gold)] text-sm">{pendingChar.name}</span>
            </div>

            <div className="space-y-2 mb-4 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#8a7a6a]">HP</span>
                <span className="text-[var(--hp-green)]">{pendingChar.hp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a7a6a]">SPEED</span>
                <span className="text-[var(--mana-blue)]">{pendingChar.speed.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a7a6a]">DAMAGE</span>
                <span className="text-[var(--blood-light)]">{pendingChar.damage.toFixed(1)}x</span>
              </div>
            </div>

            {/* Passive ability in modal */}
            <div className="rpg-frame p-2 mb-4">
              <div
                className="text-[9px] font-bold text-center"
                style={{ color: pendingChar.passive.color }}
              >
                {pendingChar.passive.name}
              </div>
              <p className="text-[7px] text-[#8a7a6a] text-center mt-1">
                {pendingChar.passive.description}
              </p>
            </div>

            <div className="divider-ornate text-xs py-2 mb-4">
              <span className="text-[var(--gold-dark)]">COST</span>
            </div>

            <div className="flex justify-center items-center gap-3 mb-6">
              <div className="vault-display">
                <Image
                  src="/sprites/ui/icon_gold.png"
                  alt="Gold"
                  width={20}
                  height={20}
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className={`stat-value ${!canAfford ? "text-[var(--blood)]" : ""}`}>
                  {pendingChar.price}
                </span>
              </div>
            </div>

            <div className="text-center text-[8px] text-[#6a5a4a] mb-6">
              THY VAULT: <span className={canAfford ? "text-[var(--forest)]" : "text-[var(--blood)]"}>{totalCoins}</span> COINS
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setPendingUnlock(null);
                }}
                className="pixel-btn flex-1 text-[10px]"
              >
                NAY
              </button>
              <button
                onClick={handleUnlock}
                disabled={!canAfford}
                className={`pixel-btn flex-1 text-[10px] ${canAfford ? "pixel-btn-success" : ""}`}
              >
                {canAfford ? "UNLOCK" : "NOT ENOUGH"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
