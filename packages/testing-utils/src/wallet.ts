import { Keypair, PublicKey } from "@solana/web3.js";

/**
 * Simple helper wallet for tests.
 */
export class TestWallet {
  readonly keypair: Keypair;

  constructor(keypair?: Keypair) {
    this.keypair = keypair ?? Keypair.generate();
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  signTransaction<T extends { sign: (signers: Keypair[]) => void }>(tx: T): T {
    tx.sign([this.keypair]);
    return tx;
  }
}
