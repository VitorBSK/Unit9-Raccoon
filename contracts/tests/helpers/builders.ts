/**
 * ============================================================================
 * Unit09 – Test Data Builders
 * Path: contracts/unit09-program/tests/helpers/builders.ts
 *
 * This module provides high-level builders for:
 *   - Instruction argument payloads (InitializeArgs, RegisterRepoArgs, etc.)
 *   - Common semantic version helpers
 *   - Randomized but deterministic-ish test data (names, URLs, tags)
 *   - One-shot workflows that create repos, modules, and forks on-chain
 *
 * All helpers are intended for tests, but they can also be reused by scripts
 * or tooling that want a convenient way to construct valid inputs for Unit09.
 *
 * All comments and identifiers are in English only.
 * ============================================================================
 */

import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import type {
  InitializeArgs,
  RegisterRepoArgs,
  UpdateRepoArgs,
  RegisterModuleArgs,
  UpdateModuleArgs,
  CreateForkArgs,
  UpdateForkStateArgs,
  RecordObservationArgs,
  RecordMetricsArgs,
  SemanticVersionTuple,
} from "../../../idl/types";

import type {
  Unit09ProgramClient,
  Unit09TestContext,
} from "./provider";

import {
  buildInitializePdaAccounts,
  deriveAllCorePdasFromProgram,
} from "./accounts";

// ============================================================================
// Internal random helpers
// ============================================================================

/**
 * Pseudo-random integer in range [min, max].
 * This is only for test data; it does not provide cryptographic randomness.
 */
export function randInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * Generate a short random suffix used in names / tags.
 */
export function randomSuffix(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[randInt(0, alphabet.length - 1)];
  }
  return out;
}

/**
 * Simple slug helper for URLs and tags.
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================================
// Semantic version helpers
// ============================================================================

export interface SemverOptions {
  major?: number;
  minor?: number;
  patch?: number;
}

/**
 * Build a semantic version tuple [major, minor, patch].
 * Defaults to [0, 1, 0] unless overridden by options.
 */
export function buildSemanticVersion(opts: SemverOptions = {}): SemanticVersionTuple {
  const major = opts.major ?? 0;
  const minor = opts.minor ?? 1;
  const patch = opts.patch ?? 0;
  return [major, minor, patch];
}

/**
 * Increment a semantic version tuple.
 * If no component is specified, minor is incremented by default.
 */
export function bumpSemanticVersion(
  version: SemanticVersionTuple,
  component: "major" | "minor" | "patch" = "minor"
): SemanticVersionTuple {
  const [maj, min, pat] = version;
  if (component === "major") {
    return [maj + 1, 0, 0];
  }
  if (component === "minor") {
    return [maj, min + 1, 0];
  }
  return [maj, min, pat + 1];
}

// ============================================================================
// Generic string builders
// ============================================================================

export interface NameOptions {
  prefix?: string;
  category?: string;
  len?: number;
}

export function buildRepoName(opts: NameOptions = {}): string {
  const prefix = opts.prefix ?? "unit09-repo";
  return `${prefix}-${randomSuffix(4)}`;
}

export function buildModuleName(opts: NameOptions = {}): string {
  const prefix = opts.prefix ?? "unit09-module";
  return `${prefix}-${randomSuffix(4)}`;
}

export function buildForkLabel(opts: NameOptions = {}): string {
  const prefix = opts.prefix ?? "unit09-fork";
  return `${prefix}-${randomSuffix(4)}`;
}

export function buildMetadataUri(kind: "repo" | "module" | "fork" = "module"): string {
  return `https://unit09.org/meta/${kind}/${randomSuffix(8)}.json`;
}

export function buildChangelogUri(): string {
  return `https://unit09.org/changelog/${randomSuffix(8)}.md`;
}

export function buildRepoUrl(): string {
  return `https://github.com/unit09-labs/unit09-example-${randomSuffix(5)}`;
}

export function buildTagLine(base?: string): string {
  const tag = base ?? "unit09,modular,solana,ai-raccoon";
  return `${tag},build-${randomSuffix(3)}`;
}

// ============================================================================
// InitializeArgs builder
// ============================================================================

export interface BuildInitializeArgsOptions {
  admin?: PublicKey;
  feeBps?: number;
  maxModulesPerRepo?: number;
  policyRef?: Uint8Array;
  lifecycleNoteRef?: Uint8Array;
}

/**
 * Build InitializeArgs with reasonable defaults.
 */
export function buildInitializeArgs(opts: BuildInitializeArgsOptions = {}): InitializeArgs {
  const defaultBytes = new Uint8Array(32);
  return {
    admin: (opts.admin ?? Keypair.generate().publicKey).toBase58(),
    feeBps: opts.feeBps ?? 250, // 2.5%
    maxModulesPerRepo: opts.maxModulesPerRepo ?? 128,
    policyRef: opts.policyRef ?? defaultBytes,
    lifecycleNoteRef: opts.lifecycleNoteRef ?? defaultBytes,
  };
}

// ============================================================================
// Repo builders
// ============================================================================

export interface BuildRegisterRepoArgsOptions {
  repoKey?: PublicKey;
  name?: string;
  url?: string;
  tags?: string;
  allowObservation?: boolean;
}

/**
 * Build RegisterRepoArgs with randomized but meaningful defaults.
 */
export function buildRegisterRepoArgs(
  opts: BuildRegisterRepoArgsOptions = {}
): RegisterRepoArgs {
  const repoKey = opts.repoKey ?? Keypair.generate().publicKey;
  const name = opts.name ?? buildRepoName();
  const url = opts.url ?? buildRepoUrl();
  const tags = opts.tags ?? buildTagLine("unit09,repo,example");
  const allowObservation = opts.allowObservation ?? true;

  return {
    repoKey: repoKey.toBase58(),
    name,
    url,
    tags,
    allowObservation,
  };
}

export interface BuildUpdateRepoArgsOptions {
  name?: string | null;
  url?: string | null;
  tags?: string | null;
  isActive?: boolean | null;
  allowObservation?: boolean | null;
}

/**
 * Build UpdateRepoArgs, typically based on an existing repo state,
 * with optional overrides. Omitted fields default to null, which
 * indicates no change.
 */
export function buildUpdateRepoArgs(
  opts: BuildUpdateRepoArgsOptions = {}
): UpdateRepoArgs {
  return {
    name: opts.name ?? null,
    url: opts.url ?? null,
    tags: opts.tags ?? null,
    isActive: opts.isActive ?? null,
    allowObservation: opts.allowObservation ?? null,
  };
}

// ============================================================================
// Module builders
// ============================================================================

export interface BuildRegisterModuleArgsOptions {
  moduleKey?: PublicKey;
  name?: string;
  metadataUri?: string;
  category?: string;
  tags?: string;
  version?: SemanticVersionTuple;
  versionLabel?: string;
  changelogUri?: string;
  isStable?: boolean;
  createInitialVersionSnapshot?: boolean;
}

/**
 * Build RegisterModuleArgs with standard defaults.
 */
export function buildRegisterModuleArgs(
  opts: BuildRegisterModuleArgsOptions = {}
): RegisterModuleArgs {
  const moduleKey = opts.moduleKey ?? Keypair.generate().publicKey;
  const version = opts.version ?? buildSemanticVersion({ major: 0, minor: 1, patch: 0 });

  return {
    moduleKey: moduleKey.toBase58(),
    name: opts.name ?? buildModuleName(),
    metadataUri: opts.metadataUri ?? buildMetadataUri("module"),
    category: opts.category ?? "unit09-core-module",
    tags: opts.tags ?? buildTagLine("unit09,module,core"),
    version,
    versionLabel: opts.versionLabel ?? `v${version[0]}.${version[1]}.${version[2]}`,
    changelogUri: opts.changelogUri ?? buildChangelogUri(),
    isStable: opts.isStable ?? false,
    createInitialVersionSnapshot: opts.createInitialVersionSnapshot ?? true,
  };
}

export interface BuildUpdateModuleArgsOptions {
  name?: string | null;
  metadataUri?: string | null;
  category?: string | null;
  tags?: string | null;
  isActive?: boolean | null;
  createVersionSnapshot?: boolean;
  newVersion?: SemanticVersionTuple | null;
  versionLabel?: string | null;
  changelogUri?: string | null;
  isStable?: boolean | null;
}

/**
 * Build UpdateModuleArgs, allowing targeted changes.
 */
export function buildUpdateModuleArgs(
  opts: BuildUpdateModuleArgsOptions = {}
): UpdateModuleArgs {
  return {
    name: opts.name ?? null,
    metadataUri: opts.metadataUri ?? null,
    category: opts.category ?? null,
    tags: opts.tags ?? null,
    isActive: opts.isActive ?? null,
    createVersionSnapshot: opts.createVersionSnapshot ?? true,
    newVersion: opts.newVersion ?? null,
    versionLabel: opts.versionLabel ?? null,
    changelogUri: opts.changelogUri ?? null,
    isStable: opts.isStable ?? null,
  };
}

// ============================================================================
// Fork builders
// ============================================================================

export interface BuildCreateForkArgsOptions {
  forkKey?: PublicKey;
  parent?: PublicKey | null;
  label?: string;
  metadataUri?: string;
  tags?: string;
  isRoot?: boolean;
  depth?: number | null;
}

/**
 * Build CreateForkArgs for a new Unit09 fork.
 */
export function buildCreateForkArgs(
  opts: BuildCreateForkArgsOptions = {}
): CreateForkArgs {
  const forkKey = opts.forkKey ?? Keypair.generate().publicKey;
  const isRoot = opts.isRoot ?? (opts.parent ? false : true);
  const depth = opts.depth ?? (isRoot ? 0 : 1);

  return {
    forkKey: forkKey.toBase58(),
    parent: opts.parent ? opts.parent.toBase58() : null,
    label: opts.label ?? buildForkLabel(),
    metadataUri: opts.metadataUri ?? buildMetadataUri("fork"),
    tags: opts.tags ?? buildTagLine("unit09,fork,branch"),
    isRoot,
    depth,
  };
}

export interface BuildUpdateForkStateArgsOptions {
  label?: string | null;
  metadataUri?: string | null;
  tags?: string | null;
  isActive?: boolean | null;
}

/**
 * Build UpdateForkStateArgs with optional overrides.
 */
export function buildUpdateForkStateArgs(
  opts: BuildUpdateForkStateArgsOptions = {}
): UpdateForkStateArgs {
  return {
    label: opts.label ?? null,
    metadataUri: opts.metadataUri ?? null,
    tags: opts.tags ?? null,
    isActive: opts.isActive ?? null,
  };
}

// ============================================================================
// Observation / metrics builders
// ============================================================================

export interface BuildRecordObservationArgsOptions {
  linesOfCode?: bigint;
  filesProcessed?: number;
  modulesTouched?: number;
  revision?: string;
  note?: string;
}

/**
 * Build RecordObservationArgs for repo observation events.
 */
export function buildRecordObservationArgs(
  opts: BuildRecordObservationArgsOptions = {}
): RecordObservationArgs {
  return {
    linesOfCode: opts.linesOfCode ?? BigInt(randInt(500, 5000)),
    filesProcessed: opts.filesProcessed ?? randInt(3, 42),
    modulesTouched: opts.modulesTouched ?? randInt(1, 12),
    revision: opts.revision ?? `rev-${randomSuffix(8)}`,
    note: opts.note ?? "Automated observation recorded during test.",
  };
}

export interface BuildRecordMetricsArgsOptions {
  totalRepos?: bigint | null;
  totalModules?: bigint | null;
  totalForks?: bigint | null;
  totalObservations?: bigint | null;
  totalLinesOfCode?: bigint | null;
  totalFilesProcessed?: bigint | null;
}

/**
 * Build RecordMetricsArgs with explicit counters or let them be null
 * to indicate "no update" on that field.
 */
export function buildRecordMetricsArgs(
  opts: BuildRecordMetricsArgsOptions = {}
): RecordMetricsArgs {
  return {
    totalRepos: opts.totalRepos ?? null,
    totalModules: opts.totalModules ?? null,
    totalForks: opts.totalForks ?? null,
    totalObservations: opts.totalObservations ?? null,
    totalLinesOfCode: opts.totalLinesOfCode ?? null,
    totalFilesProcessed: opts.totalFilesProcessed ?? null,
  };
}

// ============================================================================
// Higher-level builders (on-chain workflows used in tests)
// ============================================================================

/**
 * Initialize the Unit09 program on-chain using the provided test context.
 *
 * This helper:
 *   - Derives config / metrics / lifecycle / globalMetadata PDAs
 *   - Builds InitializeArgs with the context wallet as admin
 *   - Sends the transaction via Anchor
 *
 * It returns the transaction signature and the derived PDA set for further use.
 */
export async function initializeUnit09OnChain(
  ctx: Unit09TestContext,
  opts: Omit<BuildInitializeArgsOptions, "admin"> = {}
): Promise<{
  tx: string;
  accounts: ReturnType<typeof buildInitializePdaAccounts>;
}> {
  const program = ctx.program;
  const programId = program.programId;

  const pdaAccounts = buildInitializePdaAccounts(programId);
  const initArgs = buildInitializeArgs({
    ...opts,
    admin: ctx.wallet.publicKey,
  });

  const tx = await program.methods
    .initialize(initArgs)
    .accounts({
      ...pdaAccounts,
      admin: ctx.wallet.publicKey,
      payer: ctx.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, accounts: pdaAccounts };
}

// ---------------------------------------------------------------------------

export interface CreateRepoOnChainOptions extends BuildRegisterRepoArgsOptions {
  authority?: PublicKey;
}

/**
 * Create and register a repo on-chain using the `registerRepo` instruction.
 */
export async function createRepoOnChain(
  ctx: Unit09TestContext,
  opts: CreateRepoOnChainOptions = {}
): Promise<{
  repoKey: PublicKey;
  tx: string;
}> {
  const program = ctx.program;
  const authority = opts.authority ?? ctx.wallet.publicKey;
  const repoKey = opts.repoKey ?? Keypair.generate().publicKey;

  const args = buildRegisterRepoArgs({
    ...opts,
    repoKey,
  });

  const pda = deriveAllCorePdasFromProgram(program, { repoKey });

  const tx = await program.methods
    .registerRepo(args)
    .accounts({
      config: pda.config,
      repo: pda.repo,
      authority,
      payer: ctx.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { repoKey, tx };
}

// ---------------------------------------------------------------------------

export interface CreateModuleOnChainOptions extends BuildRegisterModuleArgsOptions {
  repoKey: PublicKey;
  authority?: PublicKey;
}

/**
 * Create and register a module on-chain attached to an existing repo.
 */
export async function createModuleOnChain(
  ctx: Unit09TestContext,
  opts: CreateModuleOnChainOptions
): Promise<{
  moduleKey: PublicKey;
  tx: string;
}> {
  const program = ctx.program;
  const authority = opts.authority ?? ctx.wallet.publicKey;
  const moduleKey = opts.moduleKey ?? Keypair.generate().publicKey;

  const args = buildRegisterModuleArgs({
    ...opts,
    moduleKey,
  });

  const pda = deriveAllCorePdasFromProgram(program, {
    repoKey: opts.repoKey,
    moduleKey,
  });

  const tx = await program.methods
    .registerModule(args)
    .accounts({
      config: pda.config,
      repo: pda.repo,
      module: pda.module,
      authority,
      payer: ctx.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { moduleKey, tx };
}

// ---------------------------------------------------------------------------

export interface CreateForkOnChainOptions extends BuildCreateForkArgsOptions {
  owner?: PublicKey;
}

/**
 * Create a fork on-chain using the `createFork` instruction.
 */
export async function createForkOnChain(
  ctx: Unit09TestContext,
  opts: CreateForkOnChainOptions = {}
): Promise<{
  forkKey: PublicKey;
  tx: string;
}> {
  const program = ctx.program;
  const owner = opts.owner ?? ctx.wallet.publicKey;
  const forkKey = opts.forkKey ?? Keypair.generate().publicKey;

  const args = buildCreateForkArgs({
    ...opts,
    forkKey,
  });

  const pda = deriveAllCorePdasFromProgram(program, {
    forkKey,
  });

  const tx = await program.methods
    .createFork(args)
    .accounts({
      config: pda.config,
      lifecycle: pda.lifecycle,
      fork: pda.fork,
      owner,
      payer: ctx.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { forkKey, tx };
}
