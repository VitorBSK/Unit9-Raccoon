import type { PipelineContext, ParsedProject } from "./types";
import { addCheckpoint } from "./runFullPipeline";

/**
 * Parse project structure. For now this step simply packages the observed
 * files into a ParsedProject, but it is the right place to add additional
 * heuristics (such as detecting workspaces or manifest files).
 */
export async function parseProject(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const files = ctx.working.files ?? [];
  const project: ParsedProject = {
    rootDir: ctx.source.localPath ?? ctx.source.repo.url ?? ctx.config.source.rootDir,
    files
  };

  ctx.working.project = project;
  diagnostics.push(`Parsed project with ${files.length} files`);

  addCheckpoint(ctx, {
    stage: "parse-project",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "build-code-graph";
  return ctx;
}
