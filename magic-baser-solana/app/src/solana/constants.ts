import { PublicKey } from "@solana/web3.js";

// Environment: 'localnet', 'devnet', or 'mainnet'
export type NetworkType = "localnet" | "devnet" | "mainnet";
export const NETWORK: NetworkType = "devnet";

// Network endpoints
export const ENDPOINTS = {
  localnet: {
    solana: "http://localhost:8899",
    magicRouter: "http://localhost:7799",
    erHttp: "http://localhost:7799",
    erWs: "ws://localhost:7800",
  },
  devnet: {
    solana: "https://api.devnet.solana.com",
    magicRouter: "https://devnet-router.magicblock.app",
    erHttp: "https://devnet.magicblock.app",
    erWs: "wss://devnet.magicblock.app",
  },
  mainnet: {
    solana: "https://api.mainnet-beta.solana.com",
    magicRouter: "https://mainnet-router.magicblock.app",
    erHttp: "https://mainnet.magicblock.app",
    erWs: "wss://mainnet.magicblock.app",
  },
} as const;

// Active endpoints based on NETWORK
export const SOLANA_RPC = ENDPOINTS[NETWORK].solana;
export const MAGIC_ROUTER_RPC = ENDPOINTS[NETWORK].magicRouter;
export const ER_HTTP_RPC = ENDPOINTS[NETWORK].erHttp;
export const ER_WS_RPC = ENDPOINTS[NETWORK].erWs;

// ER Validators (choose based on region)
export const ER_VALIDATORS = {
  asia: new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"),
  eu: new PublicKey("MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e"),
  us: new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"),
  tee: new PublicKey("FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA"),
  local: new PublicKey("mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev"),
} as const;

// Default ER validator (US region)
export const DEFAULT_ER_VALIDATOR = ER_VALIDATORS.us;

// World program (BOLT ECS)
export const WORLD_PROGRAM_ID = new PublicKey("WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n");

// Delegation Program (MagicBlock)
export const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

// World ID for current network
const WORLD_IDS: Record<NetworkType, number> = {
  mainnet: 1,  // TODO: Update after mainnet World creation
  devnet: 2421,
  localnet: 2,
};
export const WORLD_ID = WORLD_IDS[NETWORK];

const WORLD_PDAS: Record<NetworkType, PublicKey> = {
  mainnet: new PublicKey("11111111111111111111111111111111"),  // TODO: Update after mainnet World creation
  devnet: new PublicKey("3Z4teSBjiDcFSkvKbaHxY1aTq8b6t9kq6A2TZQJLXYUs"),  // devnet World ID 2421
  localnet: new PublicKey("2VTuxVLfvKqJ1Kkpa1WLPxW6YPvDxyjVypkXMNcBbCwP"),  // localnet World ID 2
};
export const WORLD_PDA = WORLD_PDAS[NETWORK];

// Component Program IDs
export const PLAYER_COMPONENT_ID = new PublicKey("6URqfQrK5GTfc9HuyT43B2CLx38ZR4uu9nAhXdDmoy7M");
export const GAME_SESSION_COMPONENT_ID = new PublicKey("9zbUFw8u3XzzNRA3TDQsGG2AkEuu2AQBXFYPxAZuWhTo");
export const LEADERBOARD_COMPONENT_ID = new PublicKey("DsGfKAe1dC62tx3AkwAad2RsvYqNFF69ki73KdemF53P");

// System Program IDs
export const INIT_PLAYER_SYSTEM_ID = new PublicKey("GLR24FCjCRLcEJN37gGcZh9KBnKtM4rKRHdAFchNwprj");
export const START_GAME_SYSTEM_ID = new PublicKey("5DeWBC5u2mWzZ46pSekwoDvknT18LKZpghY5yzT9iNR1");
export const UPDATE_STATS_SYSTEM_ID = new PublicKey("7FeyB4hz8LCrBYJusgEzKReT9rbgkrqdbB2L6aoMPv88");
export const USE_REVIVE_SYSTEM_ID = new PublicKey("GwmXPNJE1MWXBgWaMyYZiemEdboAYFceanBZUkEmBA7H");
export const END_GAME_SYSTEM_ID = new PublicKey("9ytUaZtMR4NGUPTdJbmpbX8hhpmME8muwUGXZVSq8reY");
export const SUBMIT_SCORE_SYSTEM_ID = new PublicKey("6did5KX3mcbi58jUQ85ZtTV5ahCD71pfFSF96cu73g2A");

// Game constants
export const GAME_SYNC_INTERVAL_MS = 200; // Sync to ER every 200ms
export const DEFAULT_CHARACTER = "ignis";

// Character tier types
export type CharacterTier = "Starter" | "I" | "II" | "III" | "IV" | "Legendary";

// Passive ability interface
export interface PassiveAbility {
  name: string;
  description: string;
  color: string;
}

// Extended character interface
export interface CharacterData {
  name: string;
  hp: number;
  speed: number;       // Multiplier (1.0 = normal)
  damage: number;      // Multiplier (1.0 = normal)
  price: number;       // 0 = FREE
  tier: CharacterTier;
  description: string;
  emoji: string;
  sprite: string;      // Path to sprite file
  passive: PassiveAbility;
}

// Extended characters with stats, prices, tiers and passives
export const CHARACTERS: Record<string, CharacterData> = {
  // Starter - FREE (Fire mage)
  ignis: {
    name: "Ignis",
    hp: 100,
    speed: 1.0,
    damage: 1.0,
    price: 0,
    tier: "Starter",
    description: "Fire mage, balanced",
    emoji: "🔥",
    sprite: "/sprites/characters/ignis.png",
    passive: {
      name: "Fire Trail",
      description: "Leaves burning ground (3s), 5 dmg/sec",
      color: "#FF4444",
    },
  },

  // Tier I - 100 coins
  gleisha: {
    name: "Gleisha",
    hp: 80,
    speed: 1.2,
    damage: 1.1,
    price: 100,
    tier: "I",
    description: "Ice sorceress",
    emoji: "❄️",
    sprite: "/sprites/characters/gleisha.png",
    passive: {
      name: "Frost Aura",
      description: "Slows enemies by 20% in 50px radius",
      color: "#88CCFF",
    },
  },
  lumen: {
    name: "Lumen",
    hp: 90,
    speed: 1.0,
    damage: 1.2,
    price: 100,
    tier: "I",
    description: "Light priest",
    emoji: "✨",
    sprite: "/sprites/characters/lumen.png",
    passive: {
      name: "Holy Light",
      description: "Regenerate 1 HP every 5 seconds",
      color: "#FFEE88",
    },
  },

  // Tier II - 250 coins
  umbra: {
    name: "Umbra",
    hp: 70,
    speed: 1.3,
    damage: 1.3,
    price: 250,
    tier: "II",
    description: "Shadow assassin",
    emoji: "🌑",
    sprite: "/sprites/characters/umbra.png",
    passive: {
      name: "Shadow Step",
      description: "10% chance to dodge attacks",
      color: "#6644AA",
    },
  },
  nektra: {
    name: "Nektra",
    hp: 85,
    speed: 1.0,
    damage: 1.1,
    price: 250,
    tier: "II",
    description: "Necromancer",
    emoji: "💀",
    sprite: "/sprites/characters/nektra.png",
    passive: {
      name: "Life Drain",
      description: "Heal 1 HP per 10 kills",
      color: "#44AA44",
    },
  },

  // Tier III - 500 coins
  runika: {
    name: "Runika",
    hp: 110,
    speed: 0.9,
    damage: 1.4,
    price: 500,
    tier: "III",
    description: "Rune master",
    emoji: "📜",
    sprite: "/sprites/characters/runika.png",
    passive: {
      name: "Rune Shield",
      description: "Block one attack every 30 seconds",
      color: "#AABBFF",
    },
  },
  vitalis: {
    name: "Vitalis",
    hp: 150,
    speed: 0.8,
    damage: 0.9,
    price: 500,
    tier: "III",
    description: "Nature guardian",
    emoji: "🌿",
    sprite: "/sprites/characters/vitalis.png",
    passive: {
      name: "Nature's Gift",
      description: "+50% HP pickup effectiveness",
      color: "#66DD66",
    },
  },

  // Tier IV - 1000 coins
  archon: {
    name: "Archon",
    hp: 100,
    speed: 1.1,
    damage: 1.5,
    price: 1000,
    tier: "IV",
    description: "Arcane lord",
    emoji: "⚡",
    sprite: "/sprites/characters/archon.png",
    passive: {
      name: "Arcane Mastery",
      description: "+15% weapon cooldown reduction",
      color: "#AA88FF",
    },
  },

  // Legendary - 2500 coins (placeholder - no sprite yet)
  azrael: {
    name: "Azrael",
    hp: 130,
    speed: 1.2,
    damage: 1.4,
    price: 2500,
    tier: "Legendary",
    description: "Death's herald",
    emoji: "☠️",
    sprite: "/sprites/characters/archon.png", // Fallback to archon sprite
    passive: {
      name: "Death's Touch",
      description: "5% chance to instantly kill non-boss enemies",
      color: "#FF44FF",
    },
  },
} as const;

// Character tier groupings for UI display
export const CHARACTER_TIERS: Record<CharacterTier, string[]> = {
  Starter: ["ignis"],
  I: ["gleisha", "lumen"],
  II: ["umbra", "nektra"],
  III: ["runika", "vitalis"],
  IV: ["archon"],
  Legendary: ["azrael"],
};

// Tier display info
export const TIER_INFO: Record<CharacterTier, { label: string; color: string }> = {
  Starter: { label: "FREE", color: "tier-starter" },
  I: { label: "TIER I", color: "tier-i" },
  II: { label: "TIER II", color: "tier-ii" },
  III: { label: "TIER III", color: "tier-iii" },
  IV: { label: "TIER IV", color: "tier-iv" },
  Legendary: { label: "LEGEND", color: "tier-legendary" },
};

export type CharacterId = keyof typeof CHARACTERS;
