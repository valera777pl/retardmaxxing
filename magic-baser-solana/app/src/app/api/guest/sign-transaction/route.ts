import { NextRequest, NextResponse } from "next/server";
import { Keypair, Transaction, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { SOLANA_RPC, ER_HTTP_RPC } from "@/solana/constants";

// Connections
const solanaConnection = new Connection(SOLANA_RPC, "confirmed");
const erConnection = new Connection(ER_HTTP_RPC, "confirmed");

// Load guest wallet from environment (server-side only)
function getGuestKeypair(): Keypair {
  const privateKey = process.env.GUEST_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("GUEST_WALLET_PRIVATE_KEY not configured");
  }
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serializedTx, isER } = body;

    if (!serializedTx) {
      return NextResponse.json(
        { error: "Missing serializedTx" },
        { status: 400 }
      );
    }

    const guestKeypair = getGuestKeypair();
    const connection = isER ? erConnection : solanaConnection;

    // Deserialize transaction
    const txBuffer = Buffer.from(serializedTx, "base64");
    let tx: Transaction;

    try {
      tx = Transaction.from(txBuffer);
    } catch {
      return NextResponse.json(
        { error: "Invalid transaction format" },
        { status: 400 }
      );
    }

    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = guestKeypair.publicKey;

    // Sign with guest wallet
    tx.sign(guestKeypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: isER,
    });

    // Wait for confirmation
    if (!isER) {
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
    }

    return NextResponse.json({
      success: true,
      signature,
      guestWallet: guestKeypair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error("[GuestSign] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Return guest wallet public key
export async function GET() {
  try {
    const guestKeypair = getGuestKeypair();
    return NextResponse.json({
      publicKey: guestKeypair.publicKey.toBase58(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
