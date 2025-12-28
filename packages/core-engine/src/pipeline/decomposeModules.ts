import type { PipelineContext, GeneratedModule } from "./types";
import { addCheckpoint } from "./runFullPipeline";

/**
 * Decompose the project into modules. This implementation groups files by
 * top-level directory name. It is intentionally simple but provides a useful
 * baseline that can be extended later.
 */
export async function decomposeModules(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const project = ctx.working.project;
  const files = project?.files ?? [];

  const groups: Record<string, string[]> = {};
  for (const file of files) {
    const parts = file.path.split(/[\/]/);
    const groupKey = parts.length > 1 ? parts[0] : "root";
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(file.path);
  }

  const modules: GeneratedModule[] = Object.entries(groups).map(([groupKey, paths], index) => ({
    id: `module-${index}`,
    label: groupKey,
    filePaths: paths
  }));

  ctx.working.modules = modules;
  diagnostics.push(`Decomposed project into ${modules.length} modules`);

  addCheckpoint(ctx, {
    stage: "decompose-modules",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "generate-artifacts";
  return ctx;
}
