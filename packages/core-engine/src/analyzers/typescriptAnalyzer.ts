import type { ObservedFile } from "../pipeline/types";

/**
 * Typescript analysis identifies .ts and .tsx files.
 */
export function analyzeTypescriptFiles(files: ObservedFile[]): ObservedFile[] {
  return files.filter((file) => file.path.endsWith(".ts") || file.path.endsWith(".tsx"));
}
