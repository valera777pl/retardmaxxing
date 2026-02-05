"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGame } from "@/hooks/useGame";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useGuest } from "@/contexts/GuestContext";
import { useCoins } from "@/contexts/CoinsContext";
import { GameCanvas } from "@/components/GameCanvas";
import { CharacterSelect } from "@/components/CharacterSelect";
import { DeathScreen } from "@/components/DeathScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { GameHUD } from "@/components/GameHUD";
import { LoginChoice } from "@/components/LoginChoice";
import { Leaderboard } from "@/components/Leaderboard";

export default function Home() {
  const { publicKey, disconnect } = useWallet();
  const { isGuestMode, nickname, exitGuestMode } = useGuest();
  const { totalCoins } = useCoins();
  const [inputName, setInputName] = useState("");

  const {
    screen,
    setScreen,
    localState,
    selectedCharacter,
    loading,
    error,
    connected,
    playerData,
    txCount,
    guestNickname,
    playerName,
    publicKey: gamePublicKey,
    hasCheckedPlayer,
    initializePlayer,
    startGame,
    useRevive,
    endGame,
    updateLocalState,
    setSelectedCharacter,
    syncKillToER,
  } = useGame();

  // For guest mode, use guestNickname; for wallet mode, use playerName
  const effectivePlayerName = isGuestMode ? (guestNickname || nickname) : playerName;

  // Leaderboard hook - pass playerName for name registry
  const {
    entries: leaderboardEntries,
    playerRank,
    totalPlayers,
    loading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useLeaderboard(gamePublicKey ?? undefined, effectivePlayerName || undefined);

  // Loading screen - also show loading when connected but player check is pending
  if (screen === "loading" || (connected && !hasCheckedPlayer)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dungeon-bg)]">
        <div className="text-center">
          <div className="dungeon-spinner mx-auto mb-4" />
          <p className="text-[10px] text-[#6a5a4a]">LOADING...</p>
        </div>
      </div>
    );
  }

  // Menu screen
  if (screen === "menu") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--dungeon-bg)]">
        <div className="screen-enter text-center mb-12">
          <h1 className="rpg-title text-3xl md:text-4xl mb-4">
            MAGIC BASER
          </h1>
          <p className="rpg-subtitle text-[10px] md:text-[12px] mb-2">
            VAMPIRE SURVIVORS ON SOLANA
          </p>
          <p className="text-[9px] text-[#5a4a3a]">
            POWERED BY MAGICBLOCK EPHEMERAL ROLLUPS
          </p>
        </div>

        {!connected ? (
          <LoginChoice
            onGuestStart={(name) => {
              setInputName(name);
            }}
          />
        ) : (
          <div className="screen-enter flex flex-col items-center gap-6 w-full max-w-md">
            {/* Connection status */}
            <div className="rpg-frame p-4 w-full">
              {isGuestMode ? (
                <div className="text-center">
                  <div className="stat-label mb-2">GUEST ADVENTURER</div>
                  <p className="text-[var(--forest)] text-sm">{nickname}</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="stat-label mb-2">WALLET CONNECTED</div>
                  <p className="text-[var(--gold)] text-[8px] font-mono truncate">
                    {publicKey?.toBase58()}
                  </p>
                </div>
              )}
            </div>

            {/* Player name input (wallet mode only) */}
            {!isGuestMode && (
              <div className="w-full">
                <label className="stat-label block mb-2">ADVENTURER NAME</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value.slice(0, 20))}
                  placeholder="Enter thy name..."
                  maxLength={20}
                  className="pixel-input w-full"
                />
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="rpg-frame p-4 w-full border-[var(--blood)]">
                <p className="text-[var(--blood-light)] text-[10px]">{error}</p>
              </div>
            )}

            {/* Create player button */}
            <button
              onClick={() => initializePlayer(isGuestMode ? nickname : (inputName || "Anonymous"))}
              disabled={loading}
              className={`pixel-btn w-full ${loading ? "" : isGuestMode ? "pixel-btn-success" : "pixel-btn-primary"}`}
            >
              {loading ? "CREATING HERO..." : "CREATE HERO"}
            </button>

            {/* Disconnect/Exit button */}
            <button
              onClick={() => {
                if (isGuestMode) {
                  exitGuestMode();
                } else {
                  disconnect();
                }
              }}
              className="pixel-btn text-[10px]"
            >
              {isGuestMode ? "EXIT GUEST MODE" : "DISCONNECT WALLET"}
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-[#5a4a3a]">10-50MS LATENCY VIA EPHEMERAL ROLLUPS</p>
          <p className="text-[10px] text-[#5a4a3a]">GASLESS GAMEPLAY • PAY ONLY FOR REVIVES</p>
        </div>
      </div>
    );
  }

  // Welcome back screen (for existing players)
  if (screen === "welcome-back") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--dungeon-bg)]">
        {/* Torch decorations */}
        <div className="flex justify-between w-full max-w-md px-4 mb-4">
          <span className="torch-glow text-2xl">🔥</span>
          <span className="torch-glow text-2xl">🔥</span>
        </div>

        <div className="screen-enter rpg-frame rpg-frame-corners p-8 max-w-md w-full text-center">
          <h1 className="rpg-title text-lg mb-4">WELCOME BACK</h1>

          {playerName && (
            <p className="text-[var(--gold)] text-lg mb-2">{playerName}</p>
          )}

          <p className="text-[8px] text-[#6a5a4a] mb-6">
            {isGuestMode ? "GUEST ADVENTURER" : `${publicKey?.toBase58().slice(0, 8)}...`}
          </p>

          {/* Vault display */}
          <div className="vault-display mx-auto mb-6">
            <div className="coin-icon">$</div>
            <span className="stat-value">{totalCoins}</span>
            <span className="stat-label ml-2">VAULT</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setScreen("character-select")}
              className="pixel-btn pixel-btn-primary w-full"
            >
              CONTINUE QUEST
            </button>

            <button
              onClick={() => setScreen("leaderboard")}
              className="pixel-btn w-full"
            >
              HALL OF CHAMPIONS
            </button>

            <button
              onClick={() => setScreen("menu")}
              className="pixel-btn w-full text-[10px]"
            >
              CHANGE NAME
            </button>

            <button
              onClick={() => {
                if (isGuestMode) {
                  exitGuestMode();
                } else {
                  disconnect();
                }
                setScreen("menu");
              }}
              className="pixel-btn text-[10px] mt-2"
            >
              {isGuestMode ? "EXIT GUEST MODE" : "SWITCH ACCOUNT"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard screen
  if (screen === "leaderboard") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dungeon-bg)]">
        <Leaderboard
          entries={leaderboardEntries}
          loading={leaderboardLoading}
          error={leaderboardError}
          onClose={() => setScreen("welcome-back")}
          onRefresh={refetchLeaderboard}
        />
      </div>
    );
  }

  // Character select screen
  if (screen === "character-select") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--dungeon-bg)] py-8">
        {/* Guest mode indicator */}
        {isGuestMode && (
          <div className="absolute top-4 right-4 rpg-frame p-2">
            <span className="text-[var(--forest)] text-[10px]">GUEST: {guestNickname}</span>
          </div>
        )}

        <CharacterSelect
          selectedCharacter={selectedCharacter}
          onSelect={setSelectedCharacter}
          onStart={() => startGame(selectedCharacter)}
          loading={loading}
          ownedCharacters={
            playerData?.ownedCharacters
              ? (typeof playerData.ownedCharacters === 'string'
                  ? JSON.parse(playerData.ownedCharacters)
                  : playerData.ownedCharacters)
              : ["imelda"]
          }
        />

        {/* Error display */}
        {error && (
          <div className="mt-4 rpg-frame p-4 max-w-md border-[var(--blood)]">
            <p className="text-[var(--blood-light)] text-[10px]">{error}</p>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => {
            if (isGuestMode) {
              exitGuestMode();
            } else {
              disconnect();
            }
            setScreen("menu");
          }}
          className="mt-6 pixel-btn text-[10px]"
        >
          {isGuestMode ? "EXIT GUEST MODE" : "SWITCH ACCOUNT"}
        </button>
      </div>
    );
  }

  // Playing screen
  if (screen === "playing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--dungeon-bg)]">
        {/* Guest mode indicator */}
        {isGuestMode && (
          <div className="absolute top-4 right-4 rpg-frame p-2">
            <span className="text-[var(--forest)] text-[10px]">GUEST: {guestNickname}</span>
          </div>
        )}

        <GameHUD
          state={localState}
          txCount={txCount}
          onResume={() => updateLocalState({ isPaused: false })}
        />

        <div className="rpg-frame p-1">
          <GameCanvas
            onStateUpdate={updateLocalState}
            isPlaying={!localState.isPaused && !localState.isDead}
            onKill={syncKillToER}
            characterId={selectedCharacter}
          />
        </div>

        {/* Game controls */}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => updateLocalState({ isPaused: !localState.isPaused })}
            className="pixel-btn text-[10px]"
          >
            {localState.isPaused ? "RESUME" : "PAUSE"}
          </button>
          <button
            onClick={endGame}
            disabled={loading}
            className="pixel-btn pixel-btn-danger text-[10px]"
          >
            FLEE
          </button>
        </div>
      </div>
    );
  }

  // Death screen
  if (screen === "dead") {
    return (
      <div className="min-h-screen relative bg-[var(--dungeon-bg)]">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <GameCanvas
            onStateUpdate={updateLocalState}
            isPlaying={false}
          />
        </div>
        <DeathScreen
          state={localState}
          revivesAvailable={isGuestMode ? 0 : (playerData?.revives || 0)}
          onRevive={useRevive}
          onEndGame={endGame}
          loading={loading}
          isGuestMode={isGuestMode}
          playerRank={playerRank}
          totalPlayers={totalPlayers}
        />
      </div>
    );
  }

  // Results screen
  if (screen === "results") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dungeon-bg)]">
        <ResultsScreen
          state={localState}
          onPlayAgain={() => setScreen("character-select")}
          onMainMenu={() => setScreen("welcome-back")}
          onShowLeaderboard={() => setScreen("leaderboard")}
          playerRank={playerRank}
          totalPlayers={totalPlayers}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--dungeon-bg)]">
      <div className="rpg-frame p-8">
        <p className="text-[var(--gold)] text-[10px]">UNKNOWN REALM</p>
      </div>
    </div>
  );
}
