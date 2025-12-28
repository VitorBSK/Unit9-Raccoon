import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { createSpinner } from "../utils/spinner";

export async function runDeployModule(args: string[]): Promise<void> {
  const moduleId = args[0];
  if (!moduleId) {
    process.stderr.write("Usage: unit09 deploy-module <moduleId>\n");
    return;
  }

  const cfg = loadCliConfig();
  const spinner = createSpinner(`Deploying module ${moduleId}`);
  spinner.start();

  try {
    const res = await fetch(`${cfg.apiBaseUrl}/modules/${encodeURIComponent(moduleId)}/deploy`, {
      method: "POST"
    });
    if (!res.ok) {
      const text = await res.text();
      spinner.fail("Failed to deploy module");
      process.stderr.write(text + "\n");
      return;
    }
    const json = await res.json();
    spinner.succeed("Module deployed");
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
  } catch (err: any) {
    spinner.fail("Error deploying module");
    process.stderr.write(String(err?.message ?? err) + "\n");
  }
}
