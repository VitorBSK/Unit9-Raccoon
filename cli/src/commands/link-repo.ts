import fetch from "cross-fetch";
import { loadCliConfig } from "../utils/env";
import { createSpinner } from "../utils/spinner";

export async function runLinkRepo(args: string[]): Promise<void> {
  const url = args[0];
  if (!url) {
    process.stderr.write("Usage: unit09 link-repo <url>\n");
    return;
  }

  const cfg = loadCliConfig();
  const spinner = createSpinner(`Linking repository: ${url}`);
  spinner.start();

  try {
    const res = await fetch(cfg.apiBaseUrl + "/repos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const text = await res.text();
      spinner.fail("Failed to link repository");
      process.stderr.write(text + "\n");
      return;
    }
    const json = await res.json();
    spinner.succeed("Repository linked");
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
  } catch (err: any) {
    spinner.fail("Error linking repository");
    process.stderr.write(String(err?.message ?? err) + "\n");
  }
}
