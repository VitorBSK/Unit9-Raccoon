import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

/**
 * Descriptor for a localnet instance used in tests.
 */
export interface LocalnetContext {
  url: string;
  connection: Connection;
  payer: Keypair;
}

/**
 * Create a LocalnetContext connected to the given URL.
 * This does not start a validator process; it assumes one is already running.
 */
export async function createLocalnetContext(url: string = "http://127.0.0.1:8899"): Promise<LocalnetContext> {
  const connection = new Connection(url, "confirmed");
  const payer = Keypair.generate();

  const airdropSig = await connection.requestAirdrop(payer.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig, "confirmed");

  return {
    url,
    connection,
    payer
  };
}

/**
 * Helper to fund an arbitrary public key from the test payer.
 */
export async function fundAccount(
  ctx: LocalnetContext,
  target: PublicKey,
  lamports: number
): Promise<void> {
  const sig = await ctx.connection.requestAirdrop(target, lamports);
  await ctx.connection.confirmTransaction(sig, "confirmed");
}
