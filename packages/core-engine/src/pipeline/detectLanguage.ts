import type { PipelineContext } from "./types";
import { addCheckpoint } from "./runFullPipeline";
import { detectLanguagesForFiles } from "../analyzers/multiLanguageRouter";

/**
 * Detect languages present in the file set.
 */
export async function detectLanguage(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const files = ctx.working.files ?? [];
  const result = detectLanguagesForFiles(files);

  ctx.working.languageSummary = result;
  diagnostics.push(
    `Detected languages: ${result.languages.join(", ") || "none"}; primary: ${
      result.primaryLanguage ?? "unknown"
    }`
  );

  addCheckpoint(ctx, {
    stage: "detect-language",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "parse-project";
  return ctx;
}
