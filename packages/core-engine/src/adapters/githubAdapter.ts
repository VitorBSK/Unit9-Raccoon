/**
 * Minimal types and helpers for working with GitHub-like repositories.
 * Network calls are intentionally left to the caller; this module focuses
 * on URL handling and normalization.
 */
export interface GitHubRepoRef {
  owner: string;
  name: string;
  branch?: string;
}

export function parseGitHubUrl(url: string): GitHubRepoRef | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("github.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, name] = parts;
    const branch = u.searchParams.get("ref") ?? undefined;
    return { owner, name, branch };
  } catch {
    return null;
  }
}
