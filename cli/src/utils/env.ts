import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export interface CliConfig {
  apiBaseUrl: string;
  solanaRpcUrl: string;
  programId: string;
  keypairPath?: string;
}

const CONFIG_DIR = join(homedir(), ".unit09");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function loadCliConfig(): CliConfig {
  let config: Partial<CliConfig> = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      config = JSON.parse(raw);
    } catch {
      // ignore malformed file and fall back to env
    }
  }

  return {
    apiBaseUrl: process.env.UNIT09_API_BASE_URL || config.apiBaseUrl || "http://localhost:8080/api",
    solanaRpcUrl: process.env.SOLANA_RPC_URL || config.solanaRpcUrl || "http://127.0.0.1:8899",
    programId: process.env.UNIT09_PROGRAM_ID || config.programId || "UNIT09_PROGRAM_PUBKEY_PLACEHOLDER",
    keypairPath: process.env.UNIT09_KEYPAIR || config.keypairPath
  };
}

export function saveCliConfig(partial: Partial<CliConfig>): CliConfig {
  const current = loadCliConfig();
  const next: CliConfig = {
    ...current,
    ...partial
  };
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), { encoding: "utf-8" });
  return next;
}
