/**
 * Engine configuration types for Unit09.
 */

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

/**
 * Low-level configuration for file system and repo access.
 */
export interface SourceConfig {
  /**
   * Root directory used when resolving local paths.
   */
  rootDir: string;
  /**
   * Optional path to a temporary directory for artifacts.
   */
  tempDir?: string;
  /**
   * Maximum number of files that can be processed in a single run.
   */
  maxFiles: number;
}

/**
 * Configuration for language analyzers.
 */
export interface AnalyzerConfig {
  /**
   * Whether to enable Rust / Anchor analysis.
   */
  enableRust: boolean;
  /**
   * Whether to enable TypeScript analysis.
   */
  enableTypescript: boolean;
}

/**
 * Configuration for module generation.
 */
export interface ModuleConfig {
  /**
   * Default module kind when no specific classification is available.
   */
  defaultModuleKind: string;
  /**
   * Maximum number of modules that can be emitted for a single repo.
   */
  maxModulesPerRepo: number;
}

/**
 * High-level engine configuration.
 */
export interface EngineConfig {
  logLevel: LogLevel;
  source: SourceConfig;
  analyzers: AnalyzerConfig;
  modules: ModuleConfig;
}

/**
 * Partial shape used for constructing an EngineConfig.
 */
export type EngineConfigInput = Partial<EngineConfig> & {
  source?: Partial<SourceConfig>;
  analyzers?: Partial<AnalyzerConfig>;
  modules?: Partial<ModuleConfig>;
};
