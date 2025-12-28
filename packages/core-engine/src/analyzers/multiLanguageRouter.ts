import type { ObservedFile, LanguageDetectionResult } from "../pipeline/types";
import { analyzeRustFiles } from "./rustAnalyzer";
import { analyzeTypescriptFiles } from "./typescriptAnalyzer";
import { analyzeConfigFiles } from "./configAnalyzer";

/**
 * Detect languages present in the given files.
 */
export function detectLanguagesForFiles(files: ObservedFile[]): LanguageDetectionResult {
  const rust = analyzeRustFiles(files);
  const ts = analyzeTypescriptFiles(files);
  const configs = analyzeConfigFiles(files);

  const languages: string[] = [];
  if (rust.length > 0) languages.push("rust");
  if (ts.length > 0) languages.push("typescript");
  if (configs.length > 0) languages.push("config");

  const primaryLanguage = languages[0];

  return {
    languages,
    primaryLanguage
  };
}
