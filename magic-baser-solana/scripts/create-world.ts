import { Connection, Keypair } from "@solana/web3.js";
import { InitializeNewWorld } from "@magicblock-labs/bolt-sdk";
import * as fs from "fs";
import * as os from "os";

async function main() {
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Load wallet
  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Airdrop SOL if needed
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < 1_000_000_000) {
    console.log("Requesting airdrop...");
    const sig = await connection.requestAirdrop(wallet.publicKey, 2_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop confirmed");
  }

  // Create world
  console.log("Creating world...");
  const initWorld = await InitializeNewWorld({
    payer: wallet.publicKey,
    connection,
  });

  // Sign and send
  const { blockhash } = await connection.getLatestBlockhash();
  initWorld.transaction.recentBlockhash = blockhash;
  initWorld.transaction.feePayer = wallet.publicKey;
  initWorld.transaction.sign(wallet);
  const txSig = await connection.sendRawTransaction(initWorld.transaction.serialize());
  await connection.confirmTransaction(txSig, "confirmed");

  console.log("World created!");
  console.log("World PDA:", initWorld.worldPda.toBase58());
  console.log("World ID:", initWorld.worldId.toString());
  console.log("Transaction:", txSig);
}

main().catch(console.error);
