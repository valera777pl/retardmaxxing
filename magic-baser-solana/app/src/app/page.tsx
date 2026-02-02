"use client";

import { useState } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGame } from "@/hooks/useGame";
import { GameCanvas } from "@/components/GameCanvas";
import { CharacterSelect } from "@/components/CharacterSelect";
import { DeathScreen } from "@/components/DeathScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { GameHUD } from "@/components/GameHUD";

export default function Home() {
  const { setVisible } = useWalletModal();
  const { publicKey, disconnect } = useWallet();
  const [playerName, setPlayerName] = useState("");

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
    initializePlayer,
    startGame,
    useRevive,
    endGame,
    updateLocalState,
    setSelectedCharacter,
    syncKillToER,
  } = useGame();

  // Loading screen
  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Menu screen
  if (screen === "menu") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
            MAGIC BASER
          </h1>
          <p className="text-xl text-gray-400">
            Vampire Survivors on Solana
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Powered by MagicBlock Ephemeral Rollups
          </p>
        </div>

        {!connected ? (
          <button
            onClick={() => setVisible(true)}
            className="px-8 py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all shadow-lg shadow-purple-500/30"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <div className="w-full bg-gray-800/50 rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-2">Connected:</p>
              <p className="text-white font-mono text-sm truncate">
                {publicKey?.toBase58()}
              </p>
            </div>

            <div className="w-full">
              <label className="block text-gray-400 mb-2">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none text-white"
              />
            </div>

            {error && (
              <div className="w-full p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={() => initializePlayer(playerName || "Anonymous")}
              disabled={loading}
              className={`
                w-full px-8 py-4 rounded-lg font-bold text-lg transition-all
                ${loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30"
                }
                text-white
              `}
            >
              {loading ? "Creating Player..." : "Create Player"}
            </button>

            <button
              onClick={() => disconnect()}
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        )}

        <div className="mt-16 text-center text-gray-600 text-sm">
          <p>10-50ms latency via Ephemeral Rollups</p>
          <p>Gasless gameplay, pay only for revives</p>
        </div>
      </div>
    );
  }

  // Character select screen
  if (screen === "character-select") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
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

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400 max-w-md">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Playing screen
  if (screen === "playing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <GameHUD state={localState} txCount={txCount} />

        <GameCanvas
          onStateUpdate={updateLocalState}
          isPlaying={!localState.isPaused && !localState.isDead}
          onKill={syncKillToER}
        />

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => updateLocalState({ isPaused: !localState.isPaused })}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            {localState.isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={endGame}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all"
          >
            Quit
          </button>
        </div>
      </div>
    );
  }

  // Death screen
  if (screen === "dead") {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <GameCanvas
            onStateUpdate={updateLocalState}
            isPlaying={false}
          />
        </div>
        <DeathScreen
          state={localState}
          revivesAvailable={playerData?.revives || 0}
          onRevive={useRevive}
          onEndGame={endGame}
          loading={loading}
        />
      </div>
    );
  }

  // Results screen
  if (screen === "results") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ResultsScreen
          state={localState}
          onPlayAgain={() => setScreen("character-select")}
          onMainMenu={() => setScreen("menu")}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Unknown screen state</p>
    </div>
  );
}
