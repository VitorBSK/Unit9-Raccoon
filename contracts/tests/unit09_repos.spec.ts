/**
 * ============================================================================
 * Unit09 – Repo Integration Tests
 * Path: contracts/unit09-program/tests/unit09_repos.spec.ts
 *
 * This file focuses on repo-related behavior:
 *   - Registering a new repo
 *   - Preventing duplicate registration for the same repo key
 *   - Updating repo metadata and observation flags
 *   - Recording observations against a repo
 *   - Verifying metrics counters react to repo-level activity
 *
 * It relies on helpers from:
 *   - tests/helpers/provider.ts
 *   - tests/helpers/accounts.ts
 *   - tests/helpers/builders.ts
 *   - tests/helpers/assertions.ts
 *
 * All content is written in English only.
 * ============================================================================
 */

import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

import { createUnit09TestContext } from "./helpers/provider";
import {
  deriveAllCorePdasFromProgram,
  getRepoPda,
} from "./helpers/accounts";
import {
  buildInitializeArgs,
  BuildInitializeArgsOptions,
  buildRegisterRepoArgs,
  BuildRegisterRepoArgsOptions,
  buildUpdateRepoArgs,
  buildRecordObservationArgs,
  initializeUnit09OnChain,
  createRepoOnChain,
} from "./helpers/builders";
import {
  assertRepo,
  assertMetrics,
  expectDefined,
} from "./helpers/assertions";

// Increase timeout for CI or slow RPCs
jest.setTimeout(120_000);

// Shared test context
const ctx = createUnit09TestContext();

describe("unit09_program – repos", () => {
  const initOptions: BuildInitializeArgsOptions = {
    feeBps: 250,
    maxModulesPerRepo: 128,
  };

  // We keep track of one canonical repo used across tests
  let primaryRepoKey: PublicKey;
  let primaryRepoTx: string;

  beforeAll(async () => {
    // Ensure payer is funded
    await ctx.ensurePayerHasFunds(2 * 1_000_000_000); // 2 SOL

    // Try to fetch config; if it does not exist, run initialize.
    const program = ctx.program;
    const programId = program.programId;
    const { config } = deriveAllCorePdasFromProgram(program);

    let needsInit = false;
    try {
      await program.account.config.fetch(config);
    } catch {
      needsInit = true;
    }

    if (needsInit) {
      await initializeUnit09OnChain(ctx, initOptions);
    }

    // Create one canonical repo that will be reused in several tests.
    const repoResult = await createRepoOnChain(ctx, {});
    primaryRepoKey = repoResult.repoKey;
    primaryRepoTx = repoResult.tx;
  });

  it("registers a new repo with expected metadata", async () => {
    const program = ctx.program;
    const programId = program.programId;

    const repoKey = Keypair.generate().publicKey;
    const args = buildRegisterRepoArgs({
      repoKey,
      name: "unit09-repo-primary",
      url: "https://github.com/unit09-labs/unit09-primary",
      tags: "unit09,primary,example",
      allowObservation: true,
    });

    const pdas = deriveAllCorePdasFromProgram(program, { repoKey });

    const tx = await program.methods
      .registerRepo(args)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(tx).toBeTruthy();

    const repoAcc = await program.account.repo.fetch(pdas.repo);
    const metricsAcc = await program.account.metrics.fetch(pdas.metrics);

    // Sanity check on repo fields
    assertRepo(
      { pubkey: pdas.repo, data: repoAcc },
      {
        name: args.name,
        url: args.url,
        isActive: true,
        allowObservation: true,
      }
    );

    // Metrics should now have at least one repo (we do not assume exact value,
    // but we check that totalRepos is >= 1).
    expect(metricsAcc.totalRepos instanceof BN).toBe(true);
    expect(metricsAcc.totalRepos.gte(new BN(1))).toBe(true);

    // Additional structural checks
    expectDefined(repoAcc.name, "repo.name");
    expectDefined(repoAcc.url, "repo.url");
    expect(typeof repoAcc.createdAt).toBe("number");
  });

  it("stores and retrieves the canonical repo created in setup", async () => {
    const program = ctx.program;

    const repoPda = getRepoPda(program.programId, primaryRepoKey);
    const repoAcc = await program.account.repo.fetch(repoPda);

    assertRepo(
      { pubkey: repoPda, data: repoAcc },
      {
        isActive: true,
      }
    );

    expect(typeof repoAcc.createdAt).toBe("number");
    expect(repoAcc.createdAt).toBeGreaterThan(0);
  });

  it("prevents registering the same repoKey twice", async () => {
    const program = ctx.program;
    const programId = program.programId;

    const repoKey = Keypair.generate().publicKey;
    const argsFirst = buildRegisterRepoArgs({
      repoKey,
      name: "unit09-repo-dup-1",
    });

    const pdas = deriveAllCorePdasFromProgram(program, { repoKey });

    // First registration should succeed
    const tx1 = await program.methods
      .registerRepo(argsFirst)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(tx1).toBeTruthy();

    // Second registration with same repoKey should fail
    const argsSecond = buildRegisterRepoArgs({
      repoKey,
      name: "unit09-repo-dup-2",
    });

    await expect(
      program.methods
        .registerRepo(argsSecond)
        .accounts({
          config: pdas.config,
          repo: pdas.repo,
          authority: ctx.wallet.publicKey,
          payer: ctx.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    ).rejects.toThrow();
  });

  it("updates repo metadata via updateRepo", async () => {
    const program = ctx.program;

    const repoKey = Keypair.generate().publicKey;
    const registerArgs = buildRegisterRepoArgs({
      repoKey,
      name: "unit09-repo-updatable",
      url: "https://github.com/unit09-labs/unit09-updatable",
      tags: "unit09,repo,updatable",
      allowObservation: true,
    });

    const pdas = deriveAllCorePdasFromProgram(program, { repoKey });

    await program.methods
      .registerRepo(registerArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const updateArgs = buildUpdateRepoArgs({
      name: "unit09-repo-updated",
      url: "https://github.com/unit09-labs/unit09-updated",
      tags: "unit09,repo,updated",
      isActive: true,
      allowObservation: false,
    });

    const tx = await program.methods
      .updateRepo(updateArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
      })
      .rpc();

    expect(tx).toBeTruthy();

    const repoAcc = await program.account.repo.fetch(pdas.repo);

    assertRepo(
      { pubkey: pdas.repo, data: repoAcc },
      {
        name: updateArgs.name ?? undefined,
        url: updateArgs.url ?? undefined,
        isActive: updateArgs.isActive ?? undefined,
        allowObservation: updateArgs.allowObservation ?? undefined,
      }
    );
  });

  it("allows partial updates with null fields (no change)", async () => {
    const program = ctx.program;

    const repoKey = Keypair.generate().publicKey;
    const initialName = "unit09-repo-partial";
    const initialUrl = "https://github.com/unit09-labs/unit09-partial";

    const registerArgs = buildRegisterRepoArgs({
      repoKey,
      name: initialName,
      url: initialUrl,
      tags: "unit09,repo,partial",
      allowObservation: true,
    });

    const pdas = deriveAllCorePdasFromProgram(program, { repoKey });

    await program.methods
      .registerRepo(registerArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const updateArgs = buildUpdateRepoArgs({
      name: null,
      url: null,
      // Only change allowObservation flag
      allowObservation: false,
    });

    await program.methods
      .updateRepo(updateArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        authority: ctx.wallet.publicKey,
      })
      .rpc();

    const repoAcc = await program.account.repo.fetch(pdas.repo);

    // Ensure name and url remained unchanged
    assertRepo(
      { pubkey: pdas.repo, data: repoAcc },
      {
        name: initialName,
        url: initialUrl,
        allowObservation: false,
      }
    );
  });

  it("records repo observations and touches metrics counters", async () => {
    const program = ctx.program;
    const programId = program.programId;

    const repoKey = primaryRepoKey;
    const pdasBefore = deriveAllCorePdasFromProgram(program, { repoKey });

    const metricsBefore = await program.account.metrics.fetch(pdasBefore.metrics);

    const observationArgs = buildRecordObservationArgs({
      // Use explicit values for predictable assertions
      linesOfCode: BigInt(1234),
      filesProcessed: 7,
      modulesTouched: 3,
      revision: "rev-test-1234",
      note: "test observation",
    });

    const tx = await program.methods
      .recordObservation(observationArgs)
      .accounts({
        config: pdasBefore.config,
        metrics: pdasBefore.metrics,
        repo: pdasBefore.repo,
        lifecycle: pdasBefore.lifecycle,
        observer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(tx).toBeTruthy();

    const metricsAfter = await program.account.metrics.fetch(pdasBefore.metrics);

    // Metrics should have increased by at least the specified values.
    expect(metricsAfter.totalObservations.gt(metricsBefore.totalObservations)).toBe(true);
    expect(metricsAfter.totalLinesOfCode.gt(metricsBefore.totalLinesOfCode)).toBe(true);
    expect(metricsAfter.totalFilesProcessed.gt(metricsBefore.totalFilesProcessed)).toBe(true);
  });

  it("handles multiple repos without cross-contamination", async () => {
    const program = ctx.program;

    // Repo A
    const repoAKey = Keypair.generate().publicKey;
    const repoAArgs = buildRegisterRepoArgs({
      repoKey: repoAKey,
      name: "unit09-repo-A",
      tags: "unit09,repo,A",
    });
    const pdaA = deriveAllCorePdasFromProgram(program, { repoKey: repoAKey });

    await program.methods
      .registerRepo(repoAArgs)
      .accounts({
        config: pdaA.config,
        repo: pdaA.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Repo B
    const repoBKey = Keypair.generate().publicKey;
    const repoBArgs = buildRegisterRepoArgs({
      repoKey: repoBKey,
      name: "unit09-repo-B",
      tags: "unit09,repo,B",
    });
    const pdaB = deriveAllCorePdasFromProgram(program, { repoKey: repoBKey });

    await program.methods
      .registerRepo(repoBArgs)
      .accounts({
        config: pdaB.config,
        repo: pdaB.repo,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const repoAAcc = await program.account.repo.fetch(pdaA.repo);
    const repoBAcc = await program.account.repo.fetch(pdaB.repo);

    assertRepo(
      { pubkey: pdaA.repo, data: repoAAcc },
      {
        name: repoAArgs.name,
        isActive: true,
      }
    );
    assertRepo(
      { pubkey: pdaB.repo, data: repoBAcc },
      {
        name: repoBArgs.name,
        isActive: true,
      }
    );

    expect(repoAAcc.name).not.toEqual(repoBAcc.name);
    expect(repoAAcc.createdAt).not.toEqual(repoBAcc.createdAt);
  });

  it("exposes the registration transaction for the canonical repo", () => {
    expect(primaryRepoTx).toBeTruthy();
    if (primaryRepoTx) {
      // eslint-disable-next-line no-console
      console.log("Unit09 canonical repo tx:", primaryRepoTx);
    }
  });
});
