import type { PipelineContext } from "./types";
import { addCheckpoint } from "./runFullPipeline";
import { EngineValidationError } from "../utils/error";

/**
 * Validate generated modules. This implementation enforces a basic limit
 * on module count and ensures that each module has at least one file.
 */
export async function validateModules(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const modules = ctx.working.modules ?? [];
  const maxModules = ctx.config.modules.maxModulesPerRepo;

  if (modules.length > maxModules) {
    throw new EngineValidationError(
      `Module count ${modules.length} exceeds configured limit ${maxModules}`
    );
  }

  for (const module of modules) {
    if (module.filePaths.length === 0) {
      throw new EngineValidationError(`Module ${module.id} does not contain any files`);
    }
  }

  diagnostics.push(`Validated ${modules.length} modules`);

  addCheckpoint(ctx, {
    stage: "validate-modules",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "sync-on-chain";
  return ctx;
}
