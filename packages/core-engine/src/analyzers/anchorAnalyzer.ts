import type { ObservedFile } from "../pipeline/types";

/**
 * Anchor-specific analysis, focusing on lib.rs and Anchor.toml.
 */
export function analyzeAnchorProject(files: ObservedFile[]): ObservedFile[] {
  return files.filter((file) => {
    const name = file.path.toLowerCase();
    return name.endsWith("anchor.toml") || name.endsWith("lib.rs");
  });
}
