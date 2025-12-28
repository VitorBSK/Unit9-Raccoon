import type { PipelineSource, PipelineStage, PipelineOutput, PipelineError } from "@unit09/shared-types";
import type { EngineConfig } from "../config/engineConfig";
import { buildEngineConfig } from "../config/defaults";
import { validateEngineConfigInput } from "../config/schema";
import type { PipelineContext, PipelineCheckpoint } from "./types";
import { createPipelineContext } from "./types";
import { observeCode } from "./observeCode";
import { detectLanguage } from "./detectLanguage";
import { parseProject } from "./parseProject";
import { buildCodeGraph } from "./buildCodeGraph";
import { decomposeModules } from "./decomposeModules";
import { generateModuleArtifacts } from "./generateModuleArtifacts";
import { assembleBuildPlan } from "./assembleBuildPlan";
import { validateModules } from "./validateModules";
import { syncOnChain, NoopSyncOnChainAdapter, type SyncOnChainAdapter } from "./syncOnChain";
import { EnginePipelineError } from "../utils/error";
import { createLogger } from "../logging/logger";

/**
 * Helper used by pipeline stages to register a checkpoint.
 */
export function addCheckpoint(ctx: PipelineContext, checkpoint: PipelineCheckpoint): void {
  ctx.checkpoints.push(checkpoint);
}

/**
 * Run the full pipeline from observation to sync-on-chain.
 */
export async function runFullPipeline(
  source: PipelineSource,
  configInput: Partial<EngineConfig> = {},
  syncAdapter: SyncOnChainAdapter = new NoopSyncOnChainAdapter()
): Promise<PipelineOutput | PipelineError> {
  validateEngineConfigInput(configInput);
  const engineConfig: EngineConfig = buildEngineConfig(configInput);
  const logger = createLogger(engineConfig.logLevel);

  let ctx: PipelineContext = createPipelineContext(source, "observe-code", engineConfig);

  const stages: PipelineStage[] = [
    "observe-code",
    "detect-language",
    "parse-project",
    "build-code-graph",
    "decompose-modules",
    "generate-artifacts",
    "assemble-build-plan",
    "validate-modules",
    "sync-on-chain"
  ];

  try {
    for (const stage of stages) {
      ctx.stage = stage;
      logger.debug(`Pipeline stage: ${stage}`);

      switch (stage) {
        case "observe-code":
          ctx = await observeCode(ctx);
          break;
        case "detect-language":
          ctx = await detectLanguage(ctx);
          break;
        case "parse-project":
          ctx = await parseProject(ctx);
          break;
        case "build-code-graph":
          ctx = await buildCodeGraph(ctx);
          break;
        case "decompose-modules":
          ctx = await decomposeModules(ctx);
          break;
        case "generate-artifacts":
          ctx = await generateModuleArtifacts(ctx);
          break;
        case "assemble-build-plan":
          ctx = await assembleBuildPlan(ctx);
          break;
        case "validate-modules":
          ctx = await validateModules(ctx);
          break;
        case "sync-on-chain":
          ctx = await syncOnChain(ctx, syncAdapter);
          break;
        default:
          throw new EnginePipelineError(`Unknown pipeline stage: ${stage}`, stage);
      }
    }

    const completedAt = Date.now();
    const diagnostics = ctx.checkpoints.flatMap((cp) => cp.diagnostics);

    const output: PipelineOutput = {
      modules: [],
      versions: [],
      diagnostics,
      checkpoints: ctx.checkpoints,
      completedAt
    };

    return output;
  } catch (err: any) {
    logger.error(`Pipeline failed at stage ${ctx.stage}: ${String(err?.message ?? err)}`);
    const failure: PipelineError = {
      code: "PIPELINE_FAILED",
      message: err?.message ?? "Unknown pipeline error",
      stage: ctx.stage,
      cause: err
    };
    return failure;
  }
}
