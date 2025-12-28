import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { createSpinner } from "../utils/spinner";

export async function runRunPipeline(args: string[]): Promise<void> {
  const repoKey = args[0];
  if (!repoKey) {
    process.stderr.write("Usage: unit09 run-pipeline <repoKey>\n");
    return;
  }

  const cfg = loadCliConfig();
  const spinner = createSpinner(`Enqueuing pipeline for repo ${repoKey}`);
  spinner.start();

  try {
    const res = await fetch(cfg.apiBaseUrl + "/pipeline/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ repo: { key: repoKey } })
    });
    if (!res.ok) {
      const text = await res.text();
      spinner.fail("Failed to enqueue pipeline");
      process.stderr.write(text + "\n");
      return;
    }
    const { job } = await res.json();
    spinner.succeed("Pipeline job enqueued");
    process.stdout.write(JSON.stringify(job, null, 2) + "\n");
  } catch (err: any) {
    spinner.fail("Error enqueuing pipeline");
    process.stderr.write(String(err?.message ?? err) + "\n");
  }
}
