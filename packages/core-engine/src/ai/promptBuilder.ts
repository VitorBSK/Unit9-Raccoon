/**
 * Helpers for constructing prompts that describe repositories and modules.
 */
export interface RepoSummary {
  name: string;
  url: string;
  description?: string;
  fileCount: number;
  languages: string[];
}

export function buildModuleDecompositionPrompt(summary: RepoSummary): string {
  const lines: string[] = [];
  lines.push("You are Unit09, an on-chain AI raccoon that specializes in code decomposition.");
  lines.push("Analyze the following repository and propose logical module boundaries.");
  lines.push("");
  lines.push(`Name: ${summary.name}`);
  lines.push(`URL: ${summary.url}`);
  if (summary.description) {
    lines.push(`Description: ${summary.description}`);
  }
  lines.push(`Files: ${summary.fileCount}`);
  lines.push(`Languages: ${summary.languages.join(", ") || "unknown"}`);
  lines.push("");
  lines.push("Return a concise structured description of modules and their responsibilities.");
  return lines.join("\n");
}
