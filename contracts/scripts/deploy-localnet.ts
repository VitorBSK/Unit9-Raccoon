/**
 * ============================================================================
 * Unit09 – Localnet Deployment Script
 * Path: contracts/unit09-program/scripts/deploy-localnet.ts
 *
 * This script helps you:
 *   1) Optionally start or assume a running local Solana validator
 *   2) Run `anchor build` for the Unit09 program
 *   3) Deploy the Unit09 program to localnet using `anchor deploy`
 *   4) Confirm the deployed program id
 *   5) Regenerate and patch the IDL (via generate-idl.ts)
 *
 * Usage (from repo root):
 *   npx ts-node contracts/unit09-program/scripts/deploy-localnet.ts
 *
 * Available flags:
 *   --skip-build          Do not run `anchor build` before deploy
 *   --skip-idl            Do not run the IDL generation step
 *   --program-id=<ID>     Override program id passed to anchor deploy
 *   --provider-wallet=... Override Anchor provider wallet keypair path
 *   --provider-url=...    Override provider cluster URL (default: http://127.0.0.1:8899)
 *   --quiet               Reduce log output
 *
 * Requirements:
 *   - Node.js >= 18
 *   - Anchor CLI installed and on PATH
 *   - Solana CLI installed and on PATH
 *   - `ts-node` installed if you run this file directly
 * ============================================================================
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, "..", ".."); // contracts/unit09-program/..
const PROGRAM_DIR = path.resolve(ROOT_DIR, "unit09-program");
const ANCHOR_TOML_PATH = path.resolve(PROGRAM_DIR, "Anchor.toml");

const DEFAULT_PROGRAM_NAME = "unit09_program";
const DEFAULT_LOCALNET_URL = "http://127.0.0.1:8899";

// ---------------------------------------------------------------------------
// CLI Options
// ---------------------------------------------------------------------------

interface DeployCliOptions {
  skipBuild: boolean;
  skipIdl: boolean;
  programId: string | null;
  providerWallet: string | null;
  providerUrl: string | null;
  quiet: boolean;
}

function parseCliArgs(argv: string[]): DeployCliOptions {
  let skipBuild = false;
  let skipIdl = false;
  let programId: string | null = null;
  let providerWallet: string | null = null;
  let providerUrl: string | null = null;
  let quiet = false;

  for (const arg of argv) {
    if (arg === "--skip-build") {
      skipBuild = true;
    } else if (arg === "--skip-idl") {
      skipIdl = true;
    } else if (arg === "--quiet") {
      quiet = true;
    } else if (arg.startsWith("--program-id=")) {
      programId = arg.split("=")[1]?.trim() || null;
    } else if (arg.startsWith("--provider-wallet=")) {
      providerWallet = arg.split("=")[1]?.trim() || null;
    } else if (arg.startsWith("--provider-url=")) {
      providerUrl = arg.split("=")[1]?.trim() || null;
    }
  }

  return {
    skipBuild,
    skipIdl,
    programId,
    providerWallet,
    providerUrl,
    quiet,
  };
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function log(message: string, quiet: boolean): void {
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(`[deploy-localnet] ${message}`);
  }
}

function logWarn(message: string, quiet: boolean): void {
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.warn(`[deploy-localnet] WARN: ${message}`);
  }
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[deploy-localnet] ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function prepareEnv(opts: DeployCliOptions): NodeJS.ProcessEnv {
  const env = { ...process.env };

  // Set Anchor and Solana provider URL if requested
  if (opts.providerUrl) {
    env.ANCHOR_PROVIDER_URL = opts.providerUrl;
    env.SOLANA_URL = opts.providerUrl;
  } else if (!env.ANCHOR_PROVIDER_URL && !env.SOLANA_URL) {
    env.ANCHOR_PROVIDER_URL = DEFAULT_LOCALNET_URL;
    env.SOLANA_URL = DEFAULT_LOCALNET_URL;
  }

  // Set wallet path if requested
  if (opts.providerWallet) {
    env.ANCHOR_WALLET = opts.providerWallet;
    env.SOLANA_WALLET = opts.providerWallet;
  }

  return env;
}

// ---------------------------------------------------------------------------
// Anchor / Solana helpers
// ---------------------------------------------------------------------------

async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  quiet: boolean,
  envOverrides?: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string }> {
  const env = { ...process.env, ...envOverrides };

  log(`Running: ${cmd} ${args.join(" ")}`, quiet);
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd,
    env,
  });

  if (!quiet && stdout.trim()) {
    // eslint-disable-next-line no-console
    console.log(stdout.trim());
  }
  if (stderr.trim()) {
    // Tools often output to stderr for non-critical logs
    if (!quiet) {
      // eslint-disable-next-line no-console
      console.warn(stderr.trim());
    }
  }

  return { stdout, stderr };
}

async function checkSolanaLocalnet(env: NodeJS.ProcessEnv, quiet: boolean): Promise<void> {
  try {
    const { stdout } = await runCommand("solana", ["cluster-version"], PROGRAM_DIR, quiet, env);
    if (!quiet) {
      log(`Solana cluster reachable: ${stdout.trim()}`, quiet);
    }
  } catch (err: any) {
    logWarn(
      "Unable to reach Solana localnet with `solana cluster-version`. " +
        "Make sure you have a local validator running (for example `solana-test-validator`).",
      quiet
    );
  }
}

async function runAnchorBuild(env: NodeJS.ProcessEnv, quiet: boolean): Promise<void> {
  log("Running `anchor build` for unit09_program...", quiet);

  try {
    await runCommand("anchor", ["build", "-p", DEFAULT_PROGRAM_NAME], PROGRAM_DIR, quiet, env);
  } catch (err: any) {
    logError(`anchor build failed: ${err?.message || String(err)}`);
    throw err;
  }
}

async function runAnchorDeploy(env: NodeJS.ProcessEnv, opts: DeployCliOptions): Promise<string> {
  const args = ["deploy", "-p", DEFAULT_PROGRAM_NAME];

  if (opts.programId) {
    // Note: anchor deploy supports --program-id to override
    args.push("--program-id", opts.programId);
  }

  log("Deploying program with `anchor deploy`...", opts.quiet);
  const { stdout } = await runCommand("anchor", args, PROGRAM_DIR, opts.quiet, env);

  // Try to find program id in anchor output
  // Typical lines:
  //   Deploying program "unit09_program"...
  //   Program Id: XXXXXXXXXXXXXXXXXXXXXXXXX
  let programId = opts.programId ?? "";
  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/Program Id:\s+([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (match && match[1]) {
      programId = match[1];
      break;
    }
  }

  if (!programId) {
    logWarn(
      "Could not automatically detect program id from anchor output. " +
        "You may need to check the output manually.",
      opts.quiet
    );
  } else {
    log(`Program deployed with id: ${programId}`, opts.quiet);
  }

  return programId;
}

// ---------------------------------------------------------------------------
// Anchor.toml helpers
// ---------------------------------------------------------------------------

function updateAnchorTomlProgramId(programId: string, quiet: boolean): void {
  if (!fs.existsSync(ANCHOR_TOML_PATH)) {
    logWarn(`Anchor.toml not found at ${ANCHOR_TOML_PATH}, skipping update.`, quiet);
    return;
  }

  const original = fs.readFileSync(ANCHOR_TOML_PATH, "utf8");
  const lines = original.split(/\r?\n/);

  let inProgramsSection = false;
  let modified = false;
  const updatedLines: string[] = [];

  for (const line of lines) {
    let newLine = line;
    const trimmed = line.trim();

    if (trimmed.startsWith("[programs.")) {
      inProgramsSection = true;
    }

    if (inProgramsSection && trimmed.startsWith(`${DEFAULT_PROGRAM_NAME}`)) {
      // Rewrite this line with the new program id
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "";
      newLine = `${indent}${DEFAULT_PROGRAM_NAME} = "${programId}"`;
      modified = true;
    }

    updatedLines.push(newLine);
  }

  if (!modified) {
    // Program entry may not exist; add it to the localnet section
    const insertLines: string[] = [];
    const localnetHeader = "[programs.localnet]";
    let foundLocalnetHeader = false;
    for (const line of updatedLines) {
      if (line.trim() === localnetHeader) {
        foundLocalnetHeader = true;
      }
    }

    if (!foundLocalnetHeader) {
      insertLines.push("");
      insertLines.push(localnetHeader);
    }
    insertLines.push(`${DEFAULT_PROGRAM_NAME} = "${programId}"`);

    updatedLines.push(...insertLines);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(ANCHOR_TOML_PATH, updatedLines.join("\n"), "utf8");
    log(`Anchor.toml updated with program id: ${programId}`, quiet);
  } else {
    log("Anchor.toml did not require any changes.", quiet);
  }
}

// ---------------------------------------------------------------------------
// IDL generation helper
// ---------------------------------------------------------------------------

async function runGenerateIdl(env: NodeJS.ProcessEnv, programId: string, quiet: boolean): Promise<void> {
  const scriptPath = path.resolve(PROGRAM_DIR, "scripts", "generate-idl.ts");

  if (!fs.existsSync(scriptPath)) {
    logWarn(`generate-idl.ts not found at ${scriptPath}, skipping IDL generation.`, quiet);
    return;
  }

  log("Regenerating IDL via generate-idl.ts...", quiet);

  // Use ts-node if available
  const tsNodeCmd = "npx";
  const args = [
    "ts-node",
    scriptPath,
    "--skip-build",
    `--program-id=${programId}`,
    quiet ? "--quiet" : "",
  ].filter(Boolean);

  await runCommand(tsNodeCmd, args, ROOT_DIR, quiet, env);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseCliArgs(process.argv.slice(2));
  const env = prepareEnv(opts);

  try {
    log("Starting localnet deployment for Unit09...", opts.quiet);

    await checkSolanaLocalnet(env, opts.quiet);

    if (!opts.skipBuild) {
      await runAnchorBuild(env, opts.quiet);
    } else {
      log("Skipping `anchor build` due to --skip-build flag.", opts.quiet);
    }

    const programId = await runAnchorDeploy(env, opts);

    if (programId) {
      updateAnchorTomlProgramId(programId, opts.quiet);
    }

    if (!opts.skipIdl && programId) {
      await runGenerateIdl(env, programId, opts.quiet);
    } else if (opts.skipIdl) {
      log("Skipping IDL generation due to --skip-idl flag.", opts.quiet);
    }

    log("Localnet deployment for Unit09 completed.", opts.quiet);
  } catch (err: any) {
    logError(err?.message || String(err));
    process.exitCode = 1;
  }
}

// Execute when run directly
if (require.main === module) {
  void main();
}
