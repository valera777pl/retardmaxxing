import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { FindWorldPda, FindEntityPda, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import {
  SOLANA_RPC,
  MAGIC_ROUTER_RPC,
  ER_HTTP_RPC,
  PLAYER_COMPONENT_ID,
  GAME_SESSION_COMPONENT_ID,
  DELEGATION_PROGRAM_ID,
} from "./constants";

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
