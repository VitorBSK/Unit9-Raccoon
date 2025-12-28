#!/usr/bin/env node
import { createLogger } from "./utils/logger";
import { loadCliConfig } from "./utils/env";
import { printBanner } from "@unit09/cli-kit";
import { runInit } from "./commands/init";
import { runConfigCmd } from "./commands/config";
import { runLinkRepo } from "./commands/link-repo";
import { runRunPipeline } from "./commands/run-pipeline";
import { runListModules } from "./commands/list-modules";
import { runDeployModule } from "./commands/deploy-module";
import { runCreateFork } from "./commands/create-fork";
import { runShowStats } from "./commands/show-stats";

const logger = createLogger(process.env.UNIT09_CLI_LOG_LEVEL as any || "info");
const config = loadCliConfig();

interface CommandHandler {
  (args: string[]): Promise<void>;
}

const commands: Record<string, CommandHandler> = {
  init: runInit,
  config: runConfigCmd,
  "link-repo": runLinkRepo,
  "run-pipeline": runRunPipeline,
  "list-modules": runListModules,
  "deploy-module": runDeployModule,
  "create-fork": runCreateFork,
  "show-stats": runShowStats,
  stats: runShowStats
};

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  const handler = commands[cmd];
  if (!handler) {
    logger.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    printBanner("Unit09 CLI", "Story-driven on-chain AI raccoon");
    await handler(argv.slice(1));
  } catch (err: any) {
    logger.error(`Command failed: ${err?.message ?? String(err)}`);
    process.exitCode = 1;
  }
}

function printHelp() {
  const lines = [
    "Usage: unit09 <command> [options]",
    "",
    "Commands:",
    "  init                Initialize local Unit09 configuration",
    "  config              Get or set CLI configuration values",
    "  link-repo <url>     Link a repository to Unit09",
    "  run-pipeline <repo> Run the full pipeline for a repository key",
    "  list-modules        List modules known by Unit09",
    "  deploy-module <id>  Deploy a generated module",
    "  create-fork         Create a new Unit09 fork",
    "  show-stats          Show global Unit09 statistics",
    "  stats               Alias for show-stats"
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

// Make config and logger accessible to commands if needed via globals
export { logger, config };

void main();
