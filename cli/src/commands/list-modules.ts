import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { printTable } from "@unit09/cli-kit";

export async function runListModules(args: string[]): Promise<void> {
  const repoKey = args[0];
  if (!repoKey) {
    process.stderr.write("Usage: unit09 list-modules <repoKey>\n");
    return;
  }

  const cfg = loadCliConfig();
  const res = await fetch(`${cfg.apiBaseUrl}/repos/${encodeURIComponent(repoKey)}/modules`);
  if (!res.ok) {
    const text = await res.text();
    process.stderr.write("Failed to list modules\n");
    process.stderr.write(text + "\n");
    return;
  }
  const json = await res.json();
  const modules = json.items ?? [];

  if (modules.length === 0) {
    process.stdout.write("No modules found for this repo.\n");
    return;
  }

  const rows = modules.map((m: any) => [
    m.id ?? "",
    m.name ?? "",
    m.language ?? "",
    m.version ?? "",
    m.status ?? ""
  ]);

  printTable(rows, {
    headers: ["ID", "Name", "Language", "Version", "Status"]
  });
}
