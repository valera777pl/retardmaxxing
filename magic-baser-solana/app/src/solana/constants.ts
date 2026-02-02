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
export const DEFAULT_CHARACTER = "imelda";

export const CHARACTERS = {
  imelda: { name: "Imelda", hp: 100, description: "Balanced starter" },
  antonio: { name: "Antonio", hp: 120, description: "Tank build" },
  pasqualina: { name: "Pasqualina", hp: 80, description: "Glass cannon" },
  gennaro: { name: "Gennaro", hp: 110, description: "Melee specialist" },
  mortaccio: { name: "Mortaccio", hp: 90, description: "Undead summoner" },
} as const;

export type CharacterId = keyof typeof CHARACTERS;
