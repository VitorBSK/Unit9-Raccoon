import { Connection, clusterApiUrl } from "@solana/web3.js";

export function createSolanaConnection(): Connection {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}
