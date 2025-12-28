import type { PipelineContext, ObservedFile } from "./types";
import { addCheckpoint } from "./runFullPipeline";
import { listFilesRecursive } from "../utils/fsHelpers";

/**
 * Observe code: scan the filesystem and collect basic file metadata.
 */
export async function observeCode(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const rootDir = ctx.source.localPath ?? ctx.source.repo.url ?? ctx.config.source.rootDir;
  const files = await listFilesRecursive(rootDir, ctx.config.source.maxFiles);

  const observed: ObservedFile[] = files.map((file) => ({
    path: file.relativePath,
    absolutePath: file.absolutePath,
    size: file.size
  }));

  diagnostics.push(`Observed ${observed.length} files under ${rootDir}`);

  ctx.working.files = observed;

  addCheckpoint(ctx, {
    stage: "observe-code",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "detect-language";
  return ctx;
}
