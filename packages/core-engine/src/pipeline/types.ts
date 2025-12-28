import type {
  PipelineSource,
  PipelineStage,
  PipelineContext as SharedPipelineContext,
  PipelineCheckpoint as SharedPipelineCheckpoint,
  PipelineOutput as SharedPipelineOutput,
  PipelineError as SharedPipelineError
} from "@unit09/shared-types";
import type { EngineConfig } from "../config/engineConfig";

/**
 * Internal pipeline context extends the shared context with
 * engine configuration and intermediate working data.
 */
export interface PipelineContext extends SharedPipelineContext {
  config: EngineConfig;
  /**
   * Arbitrary working state populated by pipeline stages.
   */
  working: {
    files?: ObservedFile[];
    languageSummary?: LanguageDetectionResult;
    project?: ParsedProject;
    codeGraph?: CodeGraph;
    modules?: GeneratedModule[];
    artifacts?: ModuleArtifacts;
  };
  checkpoints: PipelineCheckpoint[];
}

export interface PipelineCheckpoint extends SharedPipelineCheckpoint {}

export interface ObservedFile {
  path: string;
  absolutePath: string;
  size: number;
  language?: string;
}

export interface LanguageDetectionResult {
  languages: string[];
  primaryLanguage?: string;
}

export interface ParsedProject {
  rootDir: string;
  files: ObservedFile[];
}

export interface CodeGraphNode {
  id: string;
  filePath: string;
  symbol?: string;
}

export interface CodeGraphEdge {
  from: string;
  to: string;
  kind: "import" | "call" | "reference";
}

export interface CodeGraph {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
}

export interface GeneratedModule {
  id: string;
  label: string;
  filePaths: string[];
}

export interface ModuleArtifacts {
  moduleId: string;
  files: {
    relativePath: string;
    content: string;
  }[];
}

/**
 * Pipeline result is compatible with the shared PipelineOutput.
 */
export interface PipelineResult extends SharedPipelineOutput {}

/**
 * Pipeline failure is compatible with the shared PipelineError.
 */
export interface PipelineFailure extends SharedPipelineError {}

/**
 * Factory for constructing a fresh PipelineContext.
 */
export function createPipelineContext(
  source: PipelineSource,
  stage: PipelineStage,
  config: EngineConfig
): PipelineContext {
  return {
    source,
    stage,
    graphId: undefined,
    startedAt: Date.now(),
    metadata: {},
    config,
    working: {},
    checkpoints: []
  };
}
