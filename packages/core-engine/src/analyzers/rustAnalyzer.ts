import type { ObservedFile } from "../pipeline/types";

/**
 * Simple Rust / Anchor analyzer that only looks at file extensions.
 * This is a placeholder for deeper static analysis.
 */
export function analyzeRustFiles(files: ObservedFile[]): ObservedFile[] {
  return files.filter((file) => file.path.endsWith(".rs") || file.path.endsWith("Cargo.toml"));
}
