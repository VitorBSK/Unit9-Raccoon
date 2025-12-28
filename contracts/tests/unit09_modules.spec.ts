/**
 * ============================================================================
 * Unit09 – Module Integration Tests
 * Path: contracts/unit09-program/tests/unit09_modules.spec.ts
 *
 * This file focuses on module-related behavior:
 *   - Registering a new module attached to a repo
 *   - Ensuring initial ModuleVersion snapshot is created
 *   - Updating module metadata and version (with optional snapshot)
 *   - Preventing duplicate registration for the same module key
 *   - Verifying metrics counters react to module-level activity
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
  getModulePda,
  getModuleVersionPda,
} from "./helpers/accounts";
import {
  BuildInitializeArgsOptions,
  buildSemanticVersion,
  bumpSemanticVersion,
  buildRegisterRepoArgs,
  buildRegisterModuleArgs,
  buildUpdateModuleArgs,
  createRepoOnChain,
  createModuleOnChain,
  initializeUnit09OnChain,
} from "./helpers/builders";
import {
  assertModule,
  assertModuleVersion,
  assertRepo,
  assertMetrics,
  expectDefined,
} from "./helpers/assertions";

// Increase timeout for CI or slow RPCs
jest.setTimeout(120_000);

// Shared test context
const ctx = createUnit09TestContext();

describe("unit09_program – modules", () => {
  const initOptions: BuildInitializeArgsOptions = {
    feeBps: 250,
    maxModulesPerRepo: 256,
  };

  // Canonical repo and module used across tests
  let canonicalRepoKey: PublicKey;
  let canonicalModuleKey: PublicKey;
  let canonicalModuleVersion: [number, number, number];

  beforeAll(async () => {
    // Ensure payer is funded
    await ctx.ensurePayerHasFunds(2 * 1_000_000_000); // 2 SOL

    const program = ctx.program;
    const { config } = deriveAllCorePdasFromProgram(program);

    // Initialize program if needed
    let needsInit = false;
    try {
      await program.account.config.fetch(config);
    } catch {
      needsInit = true;
    }

    if (needsInit) {
      await initializeUnit09OnChain(ctx, initOptions);
    }

    // Create a canonical repo
    const repoResult = await createRepoOnChain(ctx, {
      name: "unit09-modules-repo",
    });
    canonicalRepoKey = repoResult.repoKey;

    // Create a canonical module attached to that repo
    const baseVersion = buildSemanticVersion({ major: 0, minor: 1, patch: 0 });
    canonicalModuleVersion = baseVersion;

    const moduleResult = await createModuleOnChain(ctx, {
      repoKey: canonicalRepoKey,
      name: "unit09-canonical-module",
      version: baseVersion,
      category: "unit09-core",
      tags: "unit09,module,canonical",
      isStable: false,
    });

    canonicalModuleKey = moduleResult.moduleKey;
  });

  it("registers a new module with expected metadata and initial version", async () => {
    const program = ctx.program;

    const repoKey = canonicalRepoKey;
    const moduleKey = Keypair.generate().publicKey;

    const initialVersion = buildSemanticVersion({ major: 0, minor: 1, patch: 0 });

    const args = buildRegisterModuleArgs({
      moduleKey,
      name: "unit09-module-alpha",
      metadataUri: "https://unit09.org/meta/module/alpha.json",
      category: "unit09-alpha",
      tags: "unit09,module,alpha",
      version: initialVersion,
      versionLabel: "v0.1.0-alpha",
      changelogUri: "https://unit09.org/changelog/module-alpha.md",
      isStable: false,
      createInitialVersionSnapshot: true,
    });

    const pdas = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: initialVersion[0],
        minor: initialVersion[1],
        patch: initialVersion[2],
      },
    });

    const tx = await program.methods
      .registerModule(args)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(tx).toBeTruthy();

    const moduleAcc = await program.account.module.fetch(pdas.module);
    const versionAcc = await program.account.moduleVersion.fetch(pdas.moduleVersion!);
    const metricsAcc = await program.account.metrics.fetch(pdas.metrics);

    // Module checks
    assertModule(
      { pubkey: pdas.module, data: moduleAcc },
      {
        name: args.name,
        category: args.category,
        isActive: true,
      }
    );

    // ModuleVersion checks
    assertModuleVersion(
      { pubkey: pdas.moduleVersion!, data: versionAcc },
      {
        version: args.version,
        versionLabel: args.versionLabel,
        isStable: args.isStable,
      }
    );

    // Metrics sanity: totalModules should be at least 1
    expect(metricsAcc.totalModules instanceof BN).toBe(true);
    expect(metricsAcc.totalModules.gte(new BN(1))).toBe(true);
  });

  it("stores and retrieves the canonical module created in setup", async () => {
    const program = ctx.program;
    const programId = program.programId;

    const modulePda = getModulePda(programId, canonicalModuleKey);
    const moduleAcc = await program.account.module.fetch(modulePda);

    assertModule(
      { pubkey: modulePda, data: moduleAcc },
      {
        name: "unit09-canonical-module",
        isActive: true,
      }
    );

    expectDefined(moduleAcc.metadataUri, "module.metadataUri");
    expect(typeof moduleAcc.createdAt).toBe("number");
    expect(moduleAcc.createdAt).toBeGreaterThan(0);
  });

  it("prevents registering the same moduleKey twice", async () => {
    const program = ctx.program;

    const repoKey = canonicalRepoKey;
    const moduleKey = Keypair.generate().publicKey;

    const firstArgs = buildRegisterModuleArgs({
      moduleKey,
      name: "unit09-module-dup-1",
    });

    const pdas = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: firstArgs.version[0],
        minor: firstArgs.version[1],
        patch: firstArgs.version[2],
      },
    });

    // First registration should succeed
    const tx1 = await program.methods
      .registerModule(firstArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(tx1).toBeTruthy();

    // Second registration with same moduleKey should fail
    const secondArgs = buildRegisterModuleArgs({
      moduleKey,
      name: "unit09-module-dup-2",
    });

    await expect(
      program.methods
        .registerModule(secondArgs)
        .accounts({
          config: pdas.config,
          repo: pdas.repo,
          module: pdas.module,
          authority: ctx.wallet.publicKey,
          payer: ctx.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    ).rejects.toThrow();
  });

  it("updates module metadata without creating a new version snapshot", async () => {
    const program = ctx.program;

    const repoKey = canonicalRepoKey;
    const moduleKey = Keypair.generate().publicKey;

    // Register a fresh module
    const registerArgs = buildRegisterModuleArgs({
      moduleKey,
      name: "unit09-module-updatable",
      metadataUri: "https://unit09.org/meta/module/updatable.json",
      category: "unit09-updatable",
      tags: "unit09,module,updatable",
    });

    const baseVersion = registerArgs.version;
    const pdas = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: baseVersion[0],
        minor: baseVersion[1],
        patch: baseVersion[2],
      },
    });

    await program.methods
      .registerModule(registerArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const updateArgs = buildUpdateModuleArgs({
      name: "unit09-module-updated",
      metadataUri: "https://unit09.org/meta/module/updated.json",
      category: "unit09-updated",
      tags: "unit09,module,updated",
      isActive: true,
      createVersionSnapshot: false, // do not create new snapshot
      newVersion: null,
      versionLabel: null,
      changelogUri: null,
      isStable: null,
    });

    const tx = await program.methods
      .updateModule(updateArgs)
      .accounts({
        config: pdas.config,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
      })
      .rpc();

    expect(tx).toBeTruthy();

    const moduleAcc = await program.account.module.fetch(pdas.module);
    const versionPda = getModuleVersionPda(
      program.programId,
      moduleKey,
      baseVersion[0],
      baseVersion[1],
      baseVersion[2]
    );
    const versionAcc = await program.account.moduleVersion.fetch(versionPda);

    // Module should reflect new metadata
    assertModule(
      { pubkey: pdas.module, data: moduleAcc },
      {
        name: updateArgs.name ?? undefined,
        category: updateArgs.category ?? undefined,
        isActive: updateArgs.isActive ?? undefined,
      }
    );

    // Existing version snapshot should be unchanged
    assertModuleVersion(
      { pubkey: versionPda, data: versionAcc },
      {
        version: baseVersion,
      }
    );
  });

  it("updates module version and creates a new snapshot when requested", async () => {
    const program = ctx.program;

    const repoKey = canonicalRepoKey;
    const moduleKey = Keypair.generate().publicKey;

    const initialVersion = buildSemanticVersion({ major: 0, minor: 1, patch: 0 });
    const registerArgs = buildRegisterModuleArgs({
      moduleKey,
      name: "unit09-module-versioned",
      version: initialVersion,
      versionLabel: "v0.1.0",
    });

    const pdasInitial = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: initialVersion[0],
        minor: initialVersion[1],
        patch: initialVersion[2],
      },
    });

    await program.methods
      .registerModule(registerArgs)
      .accounts({
        config: pdasInitial.config,
        repo: pdasInitial.repo,
        module: pdasInitial.module,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const nextVersion = bumpSemanticVersion(initialVersion, "minor");
    const updateArgs = buildUpdateModuleArgs({
      newVersion: nextVersion,
      createVersionSnapshot: true,
      versionLabel: `v${nextVersion[0]}.${nextVersion[1]}.${nextVersion[2]}`,
      changelogUri: "https://unit09.org/changelog/module-versioned-v0-2-0.md",
      isStable: true,
    });

    const tx = await program.methods
      .updateModule(updateArgs)
      .accounts({
        config: pdasInitial.config,
        module: pdasInitial.module,
        authority: ctx.wallet.publicKey,
      })
      .rpc();

    expect(tx).toBeTruthy();

    // New version snapshot PDA
    const pdasNext = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: nextVersion[0],
        minor: nextVersion[1],
        patch: nextVersion[2],
      },
    });

    const newVersionAcc = await program.account.moduleVersion.fetch(pdasNext.moduleVersion!);

    assertModuleVersion(
      { pubkey: pdasNext.moduleVersion!, data: newVersionAcc },
      {
        version: nextVersion,
        versionLabel: updateArgs.versionLabel ?? undefined,
        isStable: updateArgs.isStable ?? undefined,
      }
    );
  });

  it("supports partial updates (null fields mean no change)", async () => {
    const program = ctx.program;

    const repoKey = canonicalRepoKey;
    const moduleKey = Keypair.generate().publicKey;

    const initialName = "unit09-module-partial";
    const initialCategory = "unit09-partial";
    const initialTags = "unit09,module,partial";

    const registerArgs = buildRegisterModuleArgs({
      moduleKey,
      name: initialName,
      category: initialCategory,
      tags: initialTags,
      isStable: false,
    });

    const pdas = deriveAllCorePdasFromProgram(program, {
      repoKey,
      moduleKey,
      moduleVersion: {
        major: registerArgs.version[0],
        minor: registerArgs.version[1],
        patch: registerArgs.version[2],
      },
    });

    await program.methods
      .registerModule(registerArgs)
      .accounts({
        config: pdas.config,
        repo: pdas.repo,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
        payer: ctx.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const updateArgs = buildUpdateModuleArgs({
      name: null,
      category: null,
      tags: "unit09,module,partial-updated",
      isActive: true,
      createVersionSnapshot: false,
      newVersion: null,
      versionLabel: null,
      changelogUri: null,
      isStable: null,
    });

    await program.methods
      .updateModule(updateArgs)
      .accounts({
        config: pdas.config,
        module: pdas.module,
        authority: ctx.wallet.publicKey,
      })
      .rpc();

    const moduleAcc = await program.account.module.fetch(pdas.module);

    assertModule(
      { pubkey: pdas.module, data: moduleAcc },
      {
        name: initialName, // should remain unchanged
        category: initialCategory, // should remain unchanged
        isActive: true,
      }
    );
    expect(moduleAcc.tags).toContain("partial-updated");
  });

  it("keeps metrics consistent with module registrations", async () => {
    const program = ctx.program;

    // Use the canonical repo and create a few more modules
    const repoKey = canonicalRepoKey;
    const metricsBefore = await program.account.metrics.fetch(
      deriveAllCorePdasFromProgram(program).metrics
    );

    for (let i = 0; i < 3; i++) {
      const moduleKey = Keypair.generate().publicKey;
      const args = buildRegisterModuleArgs({
        moduleKey,
        name: `unit09-metrics-module-${i}`,
      });
      const pdas = deriveAllCorePdasFromProgram(program, {
        repoKey,
        moduleKey,
        moduleVersion: {
          major: args.version[0],
          minor: args.version[1],
          patch: args.version[2],
        },
      });

      await program.methods
        .registerModule(args)
        .accounts({
          config: pdas.config,
          repo: pdas.repo,
          module: pdas.module,
          authority: ctx.wallet.publicKey,
          payer: ctx.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const metricsAfter = await program.account.metrics.fetch(
      deriveAllCorePdasFromProgram(program).metrics
    );

    // totalModules should have increased
    expect(metricsAfter.totalModules.gt(metricsBefore.totalModules)).toBe(true);

    // Structural metrics assertion (just ensure they are BN and non-negative)
    assertMetrics(
      { pubkey: deriveAllCorePdasFromProgram(program).metrics, data: metricsAfter },
      {
        totalModules: metricsAfter.totalModules as unknown as bigint,
      }
    );
  });

  it("can still fetch repo state for modules repo without corruption", async () => {
    const program = ctx.program;
    const programId = program.programId;

    const repoPda = getRepoPda(programId, canonicalRepoKey);
    const repoAcc = await program.account.repo.fetch(repoPda);

    assertRepo(
      { pubkey: repoPda, data: repoAcc },
      {
        isActive: true,
      }
    );
  });
});
