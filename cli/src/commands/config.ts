import { loadCliConfig, saveCliConfig } from "../utils/env";

export async function runConfigCmd(args: string[]): Promise<void> {
  const sub = args[0];

  if (!sub || sub === "get") {
    const config = loadCliConfig();
    process.stdout.write(JSON.stringify(config, null, 2) + "\n");
    return;
  }

  if (sub === "set") {
    const key = args[1];
    const value = args[2];
    if (!key || typeof value === "undefined") {
      process.stderr.write("Usage: unit09 config set <key> <value>\n");
      return;
    }
    const partial: any = {};
    partial[key] = value;
    const next = saveCliConfig(partial);
    process.stdout.write(JSON.stringify(next, null, 2) + "\n");
    return;
  }

  process.stderr.write("Usage: unit09 config [get|set] ...\n");
}
