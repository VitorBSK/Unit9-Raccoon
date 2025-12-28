import type { EngineConfig, EngineConfigInput } from "./engineConfig";

/**
 * Default engine configuration.
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  logLevel: "info",
  source: {
    rootDir: process.cwd(),
    tempDir: undefined,
    maxFiles: 5000
  },
  analyzers: {
    enableRust: true,
    enableTypescript: true
  },
  modules: {
    defaultModuleKind: "other",
    maxModulesPerRepo: 256
  }
};

/**
 * Merge a partial configuration with defaults.
 */
export function buildEngineConfig(input: EngineConfigInput = {}): EngineConfig {
  return {
    logLevel: input.logLevel ?? DEFAULT_ENGINE_CONFIG.logLevel,
    source: {
      rootDir: input.source?.rootDir ?? DEFAULT_ENGINE_CONFIG.source.rootDir,
      tempDir: input.source?.tempDir ?? DEFAULT_ENGINE_CONFIG.source.tempDir,
      maxFiles: input.source?.maxFiles ?? DEFAULT_ENGINE_CONFIG.source.maxFiles
    },
    analyzers: {
      enableRust: input.analyzers?.enableRust ?? DEFAULT_ENGINE_CONFIG.analyzers.enableRust,
      enableTypescript:
        input.analyzers?.enableTypescript ?? DEFAULT_ENGINE_CONFIG.analyzers.enableTypescript
    },
    modules: {
      defaultModuleKind:
        input.modules?.defaultModuleKind ?? DEFAULT_ENGINE_CONFIG.modules.defaultModuleKind,
      maxModulesPerRepo:
        input.modules?.maxModulesPerRepo ?? DEFAULT_ENGINE_CONFIG.modules.maxModulesPerRepo
    }
  };
}
