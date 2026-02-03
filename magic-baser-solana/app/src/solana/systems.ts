import { PublicKey, Transaction, Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  ApplySystem,
  AddEntity,
  InitializeComponent,
  FindWorldPda,
  FindEntityPda,
  FindComponentPda,
  createDelegateInstruction,
  createUndelegateInstruction,
  anchor,
} from "@magicblock-labs/bolt-sdk";
import {
  START_GAME_SYSTEM_ID,
  UPDATE_STATS_SYSTEM_ID,
  USE_REVIVE_SYSTEM_ID,
  END_GAME_SYSTEM_ID,
  PLAYER_COMPONENT_ID,
  GAME_SESSION_COMPONENT_ID,
  LEADERBOARD_COMPONENT_ID,
} from "./constants";
import { getEntitySeed } from "./client";

// Dummy wallet for Anchor provider (we only need to build instructions, not sign)
class DummyWallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs;
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

// Setup Anchor provider for browser environment using BOLT SDK's anchor instance
function setupAnchorProvider(connection: Connection) {
  const dummyKeypair = Keypair.generate();
  const dummyWallet = new DummyWallet(dummyKeypair);
  const provider = new anchor.AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
}

// Initialize player - creates entities and components if not exists
export async function buildInitPlayerTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey,
  name: string,
  connection: Connection
): Promise<Transaction | null> {
  // Check if player already exists
  const playerSeed = getEntitySeed(authority, "player");
  const playerEntity = FindEntityPda({
    worldId,
    seed: playerSeed,
  });

  const playerComponent = FindComponentPda({
    componentId: PLAYER_COMPONENT_ID,
    entity: playerEntity,
  });

  const playerInfo = await connection.getAccountInfo(playerComponent);

  if (playerInfo) {
    // Player already exists
    return null;
  }

  const tx = new Transaction();

  // Create player entity
  const playerEntityResult = await AddEntity({
    payer: authority,
    world: worldPda,
    seed: playerSeed,
    connection,
  });
  tx.add(playerEntityResult.instruction);

  // Create leaderboard entity
  const lbSeed = getEntitySeed(authority, "leaderboard");
  const lbEntityResult = await AddEntity({
    payer: authority,
    world: worldPda,
    seed: lbSeed,
    connection,
  });
  tx.add(lbEntityResult.instruction);

  // Initialize Player component
  const playerCompResult = await InitializeComponent({
    payer: authority,
    entity: playerEntityResult.entityPda,
    componentId: PLAYER_COMPONENT_ID,
  });
  tx.add(playerCompResult.instruction);

  // Initialize LeaderboardEntry component
  const lbCompResult = await InitializeComponent({
    payer: authority,
    entity: lbEntityResult.entityPda,
    componentId: LEADERBOARD_COMPONENT_ID,
  });
  tx.add(lbCompResult.instruction);

  return tx;
}

// Start game - creates session and calls start_game system
export async function buildStartGameTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey,
  characterId: string,
  connection: Connection
): Promise<Transaction> {
  const tx = new Transaction();

  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({
    worldId,
    seed: sessionSeed,
  });

  const sessionComponent = FindComponentPda({
    componentId: GAME_SESSION_COMPONENT_ID,
    entity: sessionEntity,
  });

  // Check if session component exists
  const sessionInfo = await connection.getAccountInfo(sessionComponent);

  if (!sessionInfo) {
    // Create session entity
    const sessionEntityResult = await AddEntity({
      payer: authority,
      world: worldPda,
      seed: sessionSeed,
      connection,
    });
    tx.add(sessionEntityResult.instruction);

    // Initialize GameSession component
    const sessionCompResult = await InitializeComponent({
      payer: authority,
      entity: sessionEntityResult.entityPda,
      componentId: GAME_SESSION_COMPONENT_ID,
    });
    tx.add(sessionCompResult.instruction);
  }

  // Setup Anchor provider for BOLT SDK
  setupAnchorProvider(connection);

  // Call start_game system to set is_active = true
  const startResult = await ApplySystem({
    authority,
    systemId: START_GAME_SYSTEM_ID,
    world: worldPda,
    entities: [
      {
        entity: sessionEntity,
        components: [{ componentId: GAME_SESSION_COMPONENT_ID }],
      },
    ],
  });
  tx.add(startResult.instruction);

  return tx;
}

// Update stats (gasless on ER)
// entityOwner: the public key used for entity derivation (user's wallet)
// signer: the public key that will sign the transaction (can be session keypair)
export async function buildUpdateStatsTx(
  worldPda: PublicKey,
  worldId: BN,
  entityOwner: PublicKey,
  signer: PublicKey,
  stats: {
    hp: number;
    xp: number;
    goldEarned: number;
    timeSurvived: number;
    wave: number;
    kills: number;
    level: number;
    isDead: boolean;
  },
  connection: Connection
): Promise<Transaction> {
  // Entity is derived from the original owner (user's wallet)
  const sessionSeed = getEntitySeed(entityOwner, "session");
  const sessionEntity = FindEntityPda({
    worldId,
    seed: sessionSeed,
  });

  // Setup Anchor provider for BOLT SDK
  setupAnchorProvider(connection);

  // Signer can be different from entity owner (e.g., session keypair)
  const result = await ApplySystem({
    authority: signer,
    systemId: UPDATE_STATS_SYSTEM_ID,
    world: worldPda,
    entities: [
      {
        entity: sessionEntity,
        components: [{ componentId: GAME_SESSION_COMPONENT_ID }],
      },
    ],
    args: {
      hp: stats.hp,
      xp: stats.xp,
      gold_earned: stats.goldEarned,
      time_survived: stats.timeSurvived,
      wave: stats.wave,
      kills: stats.kills,
      level: stats.level,
      is_dead: stats.isDead,
    },
  });

  return result.transaction;
}

// Use revive (L1 transaction)
export async function buildUseReviveTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey,
  connection: Connection
): Promise<Transaction> {
  const playerSeed = getEntitySeed(authority, "player");
  const playerEntity = FindEntityPda({ worldId, seed: playerSeed });

  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({ worldId, seed: sessionSeed });

  // Setup Anchor provider for BOLT SDK
  setupAnchorProvider(connection);

  const result = await ApplySystem({
    authority,
    systemId: USE_REVIVE_SYSTEM_ID,
    world: worldPda,
    entities: [
      {
        entity: playerEntity,
        components: [{ componentId: PLAYER_COMPONENT_ID }],
      },
      {
        entity: sessionEntity,
        components: [{ componentId: GAME_SESSION_COMPONENT_ID }],
      },
    ],
  });

  return result.transaction;
}

// End game - simplified to only use GameSession
export async function buildEndGameTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey,
  connection: Connection
): Promise<Transaction> {
  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({ worldId, seed: sessionSeed });

  // Setup Anchor provider for BOLT SDK
  setupAnchorProvider(connection);

  const result = await ApplySystem({
    authority,
    systemId: END_GAME_SYSTEM_ID,
    world: worldPda,
    entities: [
      {
        entity: sessionEntity,
        components: [{ componentId: GAME_SESSION_COMPONENT_ID }],
      },
    ],
  });

  return result.transaction;
}

// Delegate GameSession to Ephemeral Rollup
export async function buildDelegateSessionTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey,
  connection: Connection
): Promise<Transaction> {
  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({ worldId, seed: sessionSeed });
  const sessionComponent = FindComponentPda({
    componentId: GAME_SESSION_COMPONENT_ID,
    entity: sessionEntity,
  });

  const delegateIx = createDelegateInstruction({
    entity: sessionEntity,
    account: sessionComponent,
    ownerProgram: GAME_SESSION_COMPONENT_ID,
    payer: authority,
  });

  const tx = new Transaction().add(delegateIx);
  return tx;
}

// Undelegate GameSession back to L1
export async function buildUndelegateSessionTx(
  worldPda: PublicKey,
  worldId: BN,
  authority: PublicKey
): Promise<Transaction> {
  const sessionSeed = getEntitySeed(authority, "session");
  const sessionEntity = FindEntityPda({ worldId, seed: sessionSeed });
  const sessionComponent = FindComponentPda({
    componentId: GAME_SESSION_COMPONENT_ID,
    entity: sessionEntity,
  });

  const instruction = createUndelegateInstruction({
    payer: authority,
    delegatedAccount: sessionComponent,
    componentPda: GAME_SESSION_COMPONENT_ID,  // Note: confusingly named, this is the Program ID
  });

  const tx = new Transaction().add(instruction);
  return tx;
}
