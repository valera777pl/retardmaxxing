import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { FindWorldPda, FindEntityPda, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import {
  SOLANA_RPC,
  MAGIC_ROUTER_RPC,
  PLAYER_COMPONENT_ID,
} from "./constants";

// Connections
export const solanaConnection = new Connection(SOLANA_RPC, "confirmed");
export const magicRouterConnection = new Connection(MAGIC_ROUTER_RPC, "confirmed");

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
