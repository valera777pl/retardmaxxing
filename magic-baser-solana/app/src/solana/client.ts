import { Connection, PublicKey } from "@solana/web3.js";
import { BN, BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { FindWorldPda, FindEntityPda, FindComponentPda } from "@magicblock-labs/bolt-sdk";

// Leaderboard IDL for proper deserialization (matches deployed contract)
const LEADERBOARD_IDL: Idl = {
  version: "0.2.4",
  name: "leaderboard_entry",
  address: "DsGfKAe1dC62tx3AkwAad2RsvYqNFF69ki73KdemF53P",
  metadata: {
    name: "leaderboard_entry",
    version: "0.2.4",
    spec: "0.1.0",
  },
  instructions: [],
  accounts: [
    {
      name: "LeaderboardEntry",
      discriminator: [187, 21, 182, 152, 7, 55, 20, 16],
    },
  ],
  types: [
    {
      name: "BoltMetadata",
      type: {
        kind: "struct",
        fields: [{ name: "authority", type: "pubkey" }],
      },
    },
    {
      name: "LeaderboardEntry",
      type: {
        kind: "struct",
        fields: [
          { name: "player", type: { option: "pubkey" } },
          { name: "name", type: "string" },
          { name: "bestTime", type: "u32" },
          { name: "bestWave", type: "u8" },
          { name: "totalGold", type: "u64" },
          { name: "gamesPlayed", type: "u32" },
          { name: "updatedAt", type: "i64" },
          { name: "characterId", type: "string" },
          { name: "boltMetadata", type: { defined: { name: "BoltMetadata" } } },
        ],
      },
    },
  ],
} as unknown as Idl;
import {
  SOLANA_RPC,
  MAGIC_ROUTER_RPC,
  ER_HTTP_RPC,
  PLAYER_COMPONENT_ID,
  GAME_SESSION_COMPONENT_ID,
  LEADERBOARD_COMPONENT_ID,
  DELEGATION_PROGRAM_ID,
  WORLD_ID,
} from "./constants";
import { LeaderboardDisplay } from "@/types";

// Connections
export const solanaConnection = new Connection(SOLANA_RPC, "confirmed");
export const magicRouterConnection = new Connection(MAGIC_ROUTER_RPC, "confirmed");
export const erConnection = new Connection(ER_HTTP_RPC, "confirmed");

// Re-export BOLT SDK functions
export { FindWorldPda as findWorldPda };

// Helper to derive entity seed from authority
export function getEntitySeed(authority: PublicKey, suffix: string): Uint8Array {
  const seed = `${authority.toBase58().slice(0, 20)}-${suffix}`;
  return new TextEncoder().encode(seed);
}

// Check if player exists
export async function checkPlayerExists(
  connection: Connection,
  worldId: BN,
  authority: PublicKey
): Promise<boolean> {
  const playerSeed = getEntitySeed(authority, "player");
  const playerEntity = FindEntityPda({
    worldId,
    seed: playerSeed,
  });
  const playerComponent = FindComponentPda({
    componentId: PLAYER_COMPONENT_ID,
    entity: playerEntity,
  });

  const info = await connection.getAccountInfo(playerComponent);
  return info !== null;
}

// Check if account exists
export async function accountExists(
  connection: Connection,
  pubkey: PublicKey
): Promise<boolean> {
  const info = await connection.getAccountInfo(pubkey);
  return info !== null;
}

// Fetch player data from blockchain
export async function fetchPlayerData(
  connection: Connection,
  worldId: BN,
  authority: PublicKey
): Promise<{ name: string } | null> {
  const playerSeed = getEntitySeed(authority, "player");
  const playerEntity = FindEntityPda({
    worldId,
    seed: playerSeed,
  });
  const playerComponent = FindComponentPda({
    componentId: PLAYER_COMPONENT_ID,
    entity: playerEntity,
  });

  const info = await connection.getAccountInfo(playerComponent);
  if (!info) return null;

  try {
    const data = info.data;

    // BOLT component layout:
    // - 8 bytes discriminator
    // - Option<Pubkey> authority = 1 byte tag + 32 bytes = 33 bytes
    // - String name = 4 bytes length + data
    // Total offset to name: 8 + 33 = 41

    const NAME_OFFSET = 41;

    if (data.length > NAME_OFFSET + 4) {
      const nameLen = data.readUInt32LE(NAME_OFFSET);
      if (nameLen > 0 && nameLen <= 50 && NAME_OFFSET + 4 + nameLen <= data.length) {
        const name = data.slice(NAME_OFFSET + 4, NAME_OFFSET + 4 + nameLen).toString("utf8");
        console.log("[FetchPlayer] Found name:", name);
        return { name };
      }
    }

    // Fallback: scan for valid string (in case layout is different)
    for (let offset = 0; offset < Math.min(100, data.length - 4); offset++) {
      const len = data.readUInt32LE(offset);
      if (len > 0 && len < 30 && offset + 4 + len <= data.length) {
        const str = data.slice(offset + 4, offset + 4 + len).toString("utf8");
        // Allow ASCII and Cyrillic
        if (/^[\x20-\x7E\u0400-\u04FF]+$/.test(str) && str.length >= 2) {
          console.log("[FetchPlayer] Found name at offset", offset, ":", str);
          return { name: str };
        }
      }
    }

    console.log("[FetchPlayer] Could not find valid name");
    return null;
  } catch (err) {
    console.error("Failed to parse player data:", err);
    return null;
  }
}

// Check if session account is delegated (owned by Delegation Program)
export async function checkSessionDelegated(
  connection: Connection,
  worldId: BN,
  authority: PublicKey
): Promise<boolean> {
  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({
    worldId,
    seed: sessionSeed,
  });
  const sessionComponent = FindComponentPda({
    componentId: GAME_SESSION_COMPONENT_ID,
    entity: sessionEntity,
  });

  console.log("[CheckDelegation] Session component PDA:", sessionComponent.toBase58());

  const info = await connection.getAccountInfo(sessionComponent);
  if (!info) {
    console.log("[CheckDelegation] Account does not exist");
    return false;
  }

  console.log("[CheckDelegation] Account owner:", info.owner.toBase58());
  console.log("[CheckDelegation] Delegation Program:", DELEGATION_PROGRAM_ID.toBase58());

  // Account is delegated if owned by Delegation Program
  const isDelegated = info.owner.equals(DELEGATION_PROGRAM_ID);
  console.log("[CheckDelegation] Is delegated:", isDelegated);

  return isDelegated;
}

// Raw leaderboard entry from blockchain
export interface LeaderboardEntryRaw {
  publicKey: PublicKey;
  player: PublicKey | null;
  name: string;
  bestTime: number;
  bestWave: number;
  totalGold: bigint;
  gamesPlayed: number;
  updatedAt: bigint;
  characterId: string;
}

// Fetch all leaderboard entries using getProgramAccounts with proper Anchor deserialization
export async function fetchAllLeaderboardEntries(
  connection: Connection
): Promise<LeaderboardEntryRaw[]> {
  console.log("[Leaderboard] Fetching all leaderboard entries...");

  const accounts = await connection.getProgramAccounts(LEADERBOARD_COMPONENT_ID, {
    commitment: "confirmed",
  });

  console.log("[Leaderboard] Found", accounts.length, "accounts");

  const entries: LeaderboardEntryRaw[] = [];

  // Create Anchor coder for proper deserialization
  const coder = new BorshAccountsCoder(LEADERBOARD_IDL);

  for (const { pubkey, account } of accounts) {
    try {
      // Use Anchor's coder to properly deserialize the account data
      const decoded = coder.decode("LeaderboardEntry", account.data);

      console.log("[Leaderboard] Decoded entry:", {
        player: decoded.player?.toBase58().slice(0, 8),
        name: decoded.name,
        bestTime: decoded.bestTime,
        bestWave: decoded.bestWave,
        totalGold: decoded.totalGold?.toString(),
        gamesPlayed: decoded.gamesPlayed,
      });

      entries.push({
        publicKey: pubkey,
        player: decoded.player || null,
        name: decoded.name || "",
        bestTime: decoded.bestTime || 0,
        bestWave: decoded.bestWave || 0,
        totalGold: BigInt(decoded.totalGold?.toString() || "0"),
        gamesPlayed: decoded.gamesPlayed || 0,
        updatedAt: BigInt(decoded.updatedAt?.toString() || "0"),
        characterId: decoded.characterId || "",
      });
    } catch (err) {
      console.warn("[Leaderboard] Failed to decode entry:", pubkey.toBase58(), err);

      // Fallback: try manual parsing for backwards compatibility
      try {
        const data = account.data;
        let offset = 8; // Skip discriminator

        // Read Option<Pubkey> player
        const hasPlayer = data.readUInt8(offset) === 1;
        offset += 1;
        let player: PublicKey | null = null;
        if (hasPlayer) {
          player = new PublicKey(data.slice(offset, offset + 32));
        }
        offset += 32;

        // Read name string (4 bytes length + N bytes)
        const nameLen = data.readUInt32LE(offset);
        offset += 4;
        const name = nameLen > 0 && nameLen < 100 ? data.slice(offset, offset + nameLen).toString("utf8") : "";
        offset += nameLen;

        // Read remaining fields
        const bestTime = data.readUInt32LE(offset); offset += 4;
        const bestWave = data.readUInt8(offset); offset += 1;
        const totalGold = data.readBigUInt64LE(offset); offset += 8;
        const gamesPlayed = data.readUInt32LE(offset); offset += 4;
        const updatedAt = data.readBigInt64LE(offset); offset += 8;

        // Read character_id string
        const charIdLen = data.readUInt32LE(offset); offset += 4;
        const characterId = charIdLen > 0 && charIdLen < 50
          ? data.slice(offset, offset + charIdLen).toString("utf8")
          : "";

        console.log("[Leaderboard] Fallback parsed:", { name, bestWave, bestTime, gamesPlayed, characterId });

        entries.push({
          publicKey: pubkey,
          player,
          name,
          bestTime,
          bestWave,
          totalGold,
          gamesPlayed,
          updatedAt,
          characterId,
        });
      } catch (fallbackErr) {
        console.error("[Leaderboard] Fallback parsing also failed:", fallbackErr);
      }
    }
  }

  // Don't filter - show all entries, names will be handled in rankLeaderboardEntries
  console.log("[Leaderboard] Parsed", entries.length, "entries");
  return entries;
}

// Check if a string looks like valid UTF-8 text (not binary garbage)
function isValidDisplayName(str: string): boolean {
  if (!str || str.length === 0) return false;
  // Allow alphanumeric, spaces, basic punctuation, Cyrillic, emoji
  // Reject if contains control chars or too many non-printable chars
  const validChars = /^[\p{L}\p{N}\p{P}\p{S}\p{Z}]+$/u;
  const hasControlChars = /[\x00-\x1F\x7F]/.test(str);
  return validChars.test(str) && !hasControlChars && str.length <= 30;
}

// Rank leaderboard entries by bestWave > bestTime > totalGold
export function rankLeaderboardEntries(
  entries: LeaderboardEntryRaw[],
  currentPlayerPubkey?: PublicKey,
  nameRegistry?: Record<string, string>
): LeaderboardDisplay[] {
  // Calculate expected leaderboard PDA for current player (for matching when player field is null)
  let expectedLeaderboardPda: PublicKey | null = null;
  if (currentPlayerPubkey) {
    try {
      const worldId = new BN(WORLD_ID);
      const lbSeed = getEntitySeed(currentPlayerPubkey, "leaderboard");
      const lbEntity = FindEntityPda({ worldId, seed: lbSeed });
      expectedLeaderboardPda = FindComponentPda({
        componentId: LEADERBOARD_COMPONENT_ID,
        entity: lbEntity,
      });
      console.log("[Leaderboard] Expected PDA for current player:", expectedLeaderboardPda.toBase58().slice(0, 12));
    } catch (e) {
      console.warn("[Leaderboard] Failed to derive expected PDA:", e);
    }
  }

  // Sort: higher wave first, then higher time, then higher gold
  const sorted = [...entries].sort((a, b) => {
    if (b.bestWave !== a.bestWave) return b.bestWave - a.bestWave;
    if (b.bestTime !== a.bestTime) return b.bestTime - a.bestTime;
    return Number(b.totalGold - a.totalGold);
  });

  return sorted.map((entry, index) => {
    const walletAddress = entry.player?.toBase58() || "";
    const entryPda = entry.publicKey.toBase58();

    // Determine display name with validation
    let displayName: string;
    if (isValidDisplayName(entry.name)) {
      displayName = entry.name;
    } else if (nameRegistry?.[walletAddress] && isValidDisplayName(nameRegistry[walletAddress])) {
      displayName = nameRegistry[walletAddress];
    } else if (walletAddress) {
      displayName = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    } else {
      // Use entry PDA as fallback identifier
      displayName = `Player ${entryPda.slice(0, 4)}...${entryPda.slice(-4)}`;
    }

    // Check if this is the current player - by player field OR by PDA match
    const isCurrentPlayer = currentPlayerPubkey
      ? (entry.player?.equals(currentPlayerPubkey) ?? false) ||
        (expectedLeaderboardPda?.equals(entry.publicKey) ?? false)
      : false;

    console.log("[Leaderboard] Entry display:", {
      rank: index + 1,
      rawName: entry.name,
      rawPlayer: entry.player?.toBase58()?.slice(0, 8) || "null",
      displayName,
      entryPda: entryPda.slice(0, 8),
      isCurrentPlayer,
      bestWave: entry.bestWave,
      bestTime: entry.bestTime,
    });

    return {
      rank: index + 1,
      name: displayName,
      walletAddress,
      bestTime: entry.bestTime,
      bestWave: entry.bestWave,
      totalGold: Number(entry.totalGold),
      gamesPlayed: entry.gamesPlayed,
      isCurrentPlayer,
      characterId: entry.characterId,
    };
  });
}
