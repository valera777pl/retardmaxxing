import { PublicKey } from "@solana/web3.js";
import { CharacterId } from "@/solana/constants";

// Player component data (matches Rust struct)
export interface PlayerData {
  authority: PublicKey | null;
  name: string;
  ownedCharacters: string | string[]; // JSON array as string or parsed array
  revives: number;
  totalGold: bigint;
  gamesPlayed: number;
  bestTime: number;
  bestWave: number;
  createdAt: bigint;
}

// GameSession component data (matches Rust struct)
export interface GameSessionData {
  player: PublicKey | null;
  characterId: string;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  goldEarned: number;
  timeSurvived: number;
  wave: number;
  isActive: boolean;
  isDead: boolean;
  startedAt: bigint;
  kills: number;
}

// LeaderboardEntry component data (matches Rust struct)
export interface LeaderboardEntryData {
  player: PublicKey | null;
  name: string;
  bestTime: number;
  bestWave: number;
  totalGold: bigint;
  gamesPlayed: number;
  updatedAt: bigint;
  characterId: string;
}

// Local game state (updated every frame)
export interface LocalGameState {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  gold: number;
  wave: number;
  kills: number;
  timeSurvived: number;
  isDead: boolean;
  isPaused: boolean;
}

// Game UI screens
export type GameScreen =
  | "loading"
  | "menu"
  | "welcome-back"
  | "character-select"
  | "playing"
  | "paused"
  | "dead"
  | "results"
  | "leaderboard";

// Character selection
export interface CharacterOption {
  id: CharacterId;
  name: string;
  hp: number;
  description: string;
  owned: boolean;
}

// Leaderboard entry for display
export interface LeaderboardDisplay {
  rank: number;
  name: string;
  walletAddress: string;  // For identification
  bestTime: number;
  bestWave: number;
  totalGold: number;
  gamesPlayed: number;
  isCurrentPlayer: boolean;
  characterId: string;  // For avatar display
}
