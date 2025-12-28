import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { createSpinner } from "../utils/spinner";

export async function runCreateFork(args: string[]): Promise<void> {
  const name = args[0];
  const description = args[1] || "";
  if (!name) {
    process.stderr.write("Usage: unit09 create-fork <name> [description]\n");
    return;
  }

  const cfg = loadCliConfig();
  const spinner = createSpinner(`Creating fork '${name}'`);
  spinner.start();

  try {
    const res = await fetch(cfg.apiBaseUrl + "/forks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, description })
    });
    if (!res.ok) {
      const text = await res.text();
      spinner.fail("Failed to create fork");
      process.stderr.write(text + "\n");
      return;
    }
    const json = await res.json();
    spinner.succeed("Fork created");
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
  } catch (err: any) {
    spinner.fail("Error creating fork");
    process.stderr.write(String(err?.message ?? err) + "\n");
  }
}
