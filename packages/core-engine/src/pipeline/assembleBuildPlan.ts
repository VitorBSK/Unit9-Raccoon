import type { PipelineContext } from "./types";
import { addCheckpoint } from "./runFullPipeline";

/**
 * Assemble a build plan. This is a lightweight step in the current version
 * and mainly exists so that downstream tools can hook into the pipeline
 * and augment the plan with compile or deployment steps.
 */
export async function assembleBuildPlan(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const modules = ctx.working.modules ?? [];
  diagnostics.push(`Assembled build plan for ${modules.length} modules`);

  addCheckpoint(ctx, {
    stage: "assemble-build-plan",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "validate-modules";
  return ctx;
}
