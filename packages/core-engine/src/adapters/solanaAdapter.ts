/**
 * Minimal placeholder types for integrating with Solana tooling.
 * The core-engine itself does not depend on solana-web3.js to keep
 * this package decoupled and easy to reuse.
 */
export interface SolanaProgramRef {
  programId: string;
}
