import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { LocalnetContext } from "./localnet";

/**
 * Convenience fixture for tests that interact with the Unit09 program.
 */
export interface Unit09Fixture {
  ctx: LocalnetContext;
  programId: PublicKey;
  idl: Idl;
  program: Program;
  provider: AnchorProvider;
  admin: Keypair;
}

/**
 * Create a Unit09Fixture from an existing LocalnetContext and IDL.
 * The caller is responsible for deploying the program separately.
 */
export async function createUnit09Fixture(
  ctx: LocalnetContext,
  idl: Idl,
  programId: string | PublicKey
): Promise<Unit09Fixture> {
  const admin = Keypair.generate();
  const provider = new AnchorProvider(ctx.connection, new AnchorProvider.Wallet(admin), {
    commitment: "confirmed"
  });
  const program = new Program(idl, new PublicKey(programId), provider);

  return {
    ctx,
    programId: new PublicKey(programId),
    idl,
    program,
    provider,
    admin
  };
}
