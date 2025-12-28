import type { ObservedFile } from "../pipeline/types";

/**
 * Config analyzer locates configuration files that may be relevant for
 * deployment or module boundaries.
 */
export function analyzeConfigFiles(files: ObservedFile[]): ObservedFile[] {
  const candidates = [
    "package.json",
    "tsconfig.json",
    "Anchor.toml",
    "Cargo.toml"
  ].map((name) => name.toLowerCase());

  return files.filter((file) => {
    const lower = file.path.toLowerCase();
    return candidates.some((name) => lower.endsWith(name));
  });
}
