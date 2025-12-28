import { join } from "path";

/**
 * Local git repository helper. This module does not invoke git commands
 * directly; it only provides simple path helpers that callers can use
 * when working with a local clone.
 */
export interface LocalGitRepo {
  rootDir: string;
}

export function createLocalGitRepo(rootDir: string): LocalGitRepo {
  return { rootDir };
}

export function resolveRepoPath(repo: LocalGitRepo, relative: string): string {
  return join(repo.rootDir, relative);
}
