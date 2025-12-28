import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { printTable } from "@unit09/cli-kit";

export async function runShowStats(_args: string[]): Promise<void> {
  const cfg = loadCliConfig();
  const res = await fetch(cfg.apiBaseUrl + "/stats");
  if (!res.ok) {
    const text = await res.text();
    process.stderr.write("Failed to fetch stats\n");
    process.stderr.write(text + "\n");
    return;
  }
  const { stats } = await res.json();

  const rows = [
    ["Observed lines of code", stats?.observedLines ?? ""],
    ["Modules generated", stats?.modulesGenerated ?? ""],
    ["Active forks", stats?.activeForks ?? ""],
    ["Repos tracked", stats?.reposTracked ?? ""],
    ["Last sync", stats?.lastSyncAt ?? ""]
  ];

  printTable(rows, { headers: ["Metric", "Value"] });
}
