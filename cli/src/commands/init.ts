import { saveCliConfig, loadCliConfig } from "../utils/env";
import { askText } from "@unit09/cli-kit";

export async function runInit(_args: string[]): Promise<void> {
  const current = loadCliConfig();

  const apiBaseUrl = await askText("Unit09 API base URL", {
    defaultValue: current.apiBaseUrl
  });
  const solanaRpcUrl = await askText("Solana RPC URL", {
    defaultValue: current.solanaRpcUrl
  });
  const programId = await askText("Unit09 program ID", {
    defaultValue: current.programId
  });
  const keypairPath = await askText("Path to Solana keypair (optional)", {
    defaultValue: current.keypairPath
  });

  const next = saveCliConfig({
    apiBaseUrl,
    solanaRpcUrl,
    programId,
    keypairPath: keypairPath || undefined
  });

  process.stdout.write("Configuration saved to ~/.unit09/config.json\n");
  process.stdout.write(JSON.stringify(next, null, 2) + "\n");
}
