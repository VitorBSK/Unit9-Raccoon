/**
 * ============================================================================
 * Unit09 – Devnet Deployment Script
 * Path: contracts/unit09-program/scripts/deploy-devnet.ts
 *
 * This script helps you:
 *   1) Prepare an Anchor / Solana environment targeting devnet
 *   2) Optionally run `anchor build` for the Unit09 program
 *   3) Deploy the Unit09 program to devnet using `anchor deploy`
 *   4) Parse and persist the deployed program id into Anchor.toml
 *   5) Regenerate and patch the IDL (via generate-idl.ts)
 *
 * Usage (from repo root):
 *   npx ts-node contracts/unit09-program/scripts/deploy-devnet.ts
 *
 * Available flags:
 *   --skip-build              Do not run `anchor build` before deploy
 *   --skip-idl                Do not run the IDL generation step
 *   --program-id=<ID>         Override program id passed to anchor deploy
 *   --provider-wallet=<PATH>  Override Anchor provider wallet keypair path
 *   --provider-url=<URL>      Override provider cluster URL (default: https://api.devnet.solana.com)
 *   --confirm-upgrade         Require explicit confirmation before deploying
 *   --quiet                   Reduce log output
 *
 * Requirements:
 *   - Node.js >= 18
 *   - Anchor CLI installed and on PATH
 *   - Solana CLI installed and on PATH
 *   - `ts-node` installed if you run this file directly
 * ============================================================================
 */

import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, "..", ".."); // contracts/
const PROGRAM_DIR = path.resolve(ROOT_DIR, "unit09-program");
const ANCHOR_TOML_PATH = path.resolve(PROGRAM_DIR, "Anchor.toml");

const DEFAULT_PROGRAM_NAME = "unit09_program";
const DEFAULT_DEVNET_URL = "https://api.devnet.solana.com";

// ---------------------------------------------------------------------------
// CLI Options
// ---------------------------------------------------------------------------

interface DeployCliOptions {
  skipBuild: boolean;
  skipIdl: boolean;
  programId: string | null;
  providerWallet: string | null;
  providerUrl: string | null;
  confirmUpgrade: boolean;
  quiet: boolean;
}

function parseCliArgs(argv: string[]): DeployCliOptions {
  let skipBuild = false;
  let skipIdl = false;
  let programId: string | null = null;
  let providerWallet: string | null = null;
  let providerUrl: string | null = null;
  let confirmUpgrade = false;
  let quiet = false;

  for (const arg of argv) {
    if (arg === "--skip-build") {
      skipBuild = true;
    } else if (arg === "--skip-idl") {
      skipIdl = true;
    } else if (arg === "--quiet") {
      quiet = true;
    } else if (arg === "--confirm-upgrade") {
      confirmUpgrade = true;
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
    confirmUpgrade,
    quiet,
  };
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function log(message: string, quiet: boolean): void {
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(`[deploy-devnet] ${message}`);
  }
}

function logWarn(message: string, quiet: boolean): void {
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.warn(`[deploy-devnet] WARN: ${message}`);
  }
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[deploy-devnet] ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function prepareEnv(opts: DeployCliOptions): NodeJS.ProcessEnv {
  const env = { ...process.env };

  // Provider URL (cluster)
  if (opts.providerUrl) {
    env.ANCHOR_PROVIDER_URL = opts.providerUrl;
    env.SOLANA_URL = opts.providerUrl;
  } else {
    if (!env.ANCHOR_PROVIDER_URL) {
      env.ANCHOR_PROVIDER_URL = DEFAULT_DEVNET_URL;
    }
    if (!env.SOLANA_URL) {
      env.SOLANA_URL = DEFAULT_DEVNET_URL;
    }
  }

  // Wallet
  if (opts.providerWallet) {
    env.ANCHOR_WALLET = opts.providerWallet;
    env.SOLANA_WALLET = opts.providerWallet;
  }

  return env;
}

// ---------------------------------------------------------------------------
// Command helpers
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
    if (!quiet) {
      // eslint-disable-next-line no-console
      console.warn(stderr.trim());
    }
  }

  return { stdout, stderr };
}

// ---------------------------------------------------------------------------
// Devnet / Solana helpers
// ---------------------------------------------------------------------------

async function checkSolanaDevnet(env: NodeJS.ProcessEnv, quiet: boolean): Promise<void> {
  try {
    const { stdout } = await runCommand("solana", ["cluster-version"], PROGRAM_DIR, quiet, env);
    if (!quiet) {
      log(`Solana cluster reachable: ${stdout.trim()}`, quiet);
    }
  } catch (err: any) {
    logWarn(
      "Unable to reach the cluster with `solana cluster-version`. " +
        "Make sure your RPC URL is set correctly (--provider-url or env).",
      quiet
    );
  }
}

async function checkDevnetBalance(env: NodeJS.ProcessEnv, quiet: boolean): Promise<void> {
  try {
    const { stdout } = await runCommand("solana", ["balance"], PROGRAM_DIR, quiet, env);
    if (!quiet) {
      log(`Current wallet balance on devnet: ${stdout.trim()}`, quiet);
    }
  } catch (err: any) {
    logWarn(
      "Unable to check wallet balance with `solana balance`. " +
        "You may need to configure your wallet or request airdrop on devnet.",
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
    args.push("--program-id", opts.programId);
  }

  log("Deploying program with `anchor deploy` to devnet...", opts.quiet);
  const { stdout } = await runCommand("anchor", args, PROGRAM_DIR, opts.quiet, env);

  // Try to parse program id from anchor output
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

  let inProgramsDevnet = false;
  let modified = false;
  const updatedLines: string[] = [];

  for (const line of lines) {
    let newLine = line;
    const trimmed = line.trim();

    if (trimmed.startsWith("[programs.")) {
      inProgramsDevnet = trimmed === "[programs.devnet]";
    }

    if (inProgramsDevnet && trimmed.startsWith(`${DEFAULT_PROGRAM_NAME}`)) {
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "";
      newLine = `${indent}${DEFAULT_PROGRAM_NAME} = "${programId}"`;
      modified = true;
    }

    updatedLines.push(newLine);
  }

  if (!modified) {
    const devnetHeader = "[programs.devnet]";
    let foundDevnetHeader = false;
    for (const line of updatedLines) {
      if (line.trim() === devnetHeader) {
        foundDevnetHeader = true;
        break;
      }
    }

    if (!foundDevnetHeader) {
      updatedLines.push("");
      updatedLines.push(devnetHeader);
    }
    updatedLines.push(`${DEFAULT_PROGRAM_NAME} = "${programId}"`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(ANCHOR_TOML_PATH, updatedLines.join("\n"), "utf8");
    log(`Anchor.toml updated with devnet program id: ${programId}`, quiet);
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
// Safety prompt for upgrades
// ---------------------------------------------------------------------------

async function askYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

/**
 * Try to read existing devnet program id from Anchor.toml for display.
 */
function readCurrentDevnetProgramId(quiet: boolean): string | null {
  if (!fs.existsSync(ANCHOR_TOML_PATH)) {
    logWarn(`Anchor.toml not found at ${ANCHOR_TOML_PATH}.`, quiet);
    return null;
  }

  const content = fs.readFileSync(ANCHOR_TOML_PATH, "utf8");
  const lines = content.split(/\r?\n/);

  let inDevnetSection = false;
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[programs.")) {
      inDevnetSection = trimmed === "[programs.devnet]";
    }

    if (inDevnetSection && trimmed.startsWith(`${DEFAULT_PROGRAM_NAME}`)) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const value = parts[1].trim();
        const match = value.match(/"([^"]+)"/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Optional: live tail of validator logs (if user wants to see devnet logs)
// This is not strictly required for deployment; provided as a helper.
// ---------------------------------------------------------------------------

function spawnSolanaLogs(env: NodeJS.ProcessEnv, quiet: boolean): void {
  try {
    const child = spawn("solana", ["logs", "-u", env.SOLANA_URL || DEFAULT_DEVNET_URL], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (!quiet) {
        // eslint-disable-next-line no-console
        console.log(`[solana-logs] ${text.trimEnd()}`);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      if (!quiet) {
        // eslint-disable-next-line no-console
        console.warn(`[solana-logs] ${text.trimEnd()}`);
      }
    });

    child.on("error", (err) => {
      logWarn(`solana logs process error: ${err.message}`, quiet);
    });

    child.on("exit", (code) => {
      if (!quiet) {
        log(`solana logs process exited with code ${code ?? "unknown"}`, quiet);
      }
    });
  } catch (err: any) {
    logWarn(`Unable to spawn solana logs: ${err?.message || String(err)}`, quiet);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseCliArgs(process.argv.slice(2));
  const env = prepareEnv(opts);

  try {
    log("Starting devnet deployment for Unit09...", opts.quiet);

    await checkSolanaDevnet(env, opts.quiet);
    await checkDevnetBalance(env, opts.quiet);

    const currentProgramId = readCurrentDevnetProgramId(opts.quiet);
    if (currentProgramId) {
      log(`Current devnet program id in Anchor.toml: ${currentProgramId}`, opts.quiet);
      if (opts.confirmUpgrade) {
        const proceed = await askYesNo(
          `You are about to deploy and potentially upgrade program ${currentProgramId} on devnet. Continue`
        );
        if (!proceed) {
          log("User aborted deployment.", opts.quiet);
          return;
        }
      }
    } else if (opts.confirmUpgrade) {
      const proceed = await askYesNo(
        "No existing devnet program id detected in Anchor.toml. Deploy new program on devnet"
      );
      if (!proceed) {
        log("User aborted deployment.", opts.quiet);
        return;
      }
    }

    if (!opts.skipBuild) {
      await runAnchorBuild(env, opts.quiet);
    } else {
      log("Skipping `anchor build` due to --skip-build flag.", opts.quiet);
    }

    // Optional: spawn devnet logs in background (comment out if not desired)
    // spawnSolanaLogs(env, opts.quiet);

    const programId = await runAnchorDeploy(env, opts);

    if (programId) {
      updateAnchorTomlProgramId(programId, opts.quiet);
    }

    if (!opts.skipIdl && programId) {
      await runGenerateIdl(env, programId, opts.quiet);
    } else if (opts.skipIdl) {
      log("Skipping IDL generation due to --skip-idl flag.", opts.quiet);
    }

    log("Devnet deployment for Unit09 completed.", opts.quiet);
  } catch (err: any) {
    logError(err?.message || String(err));
    process.exitCode = 1;
  }
}

// Execute when run directly
if (require.main === module) {
  void main();
}
