/**
 * Public entrypoint for the Unit09 core engine.
 *
 * This package is responsible for orchestrating the end-to-end pipeline
 * that observes code, analyzes projects, decomposes modules, and prepares
 * artifacts that can be synced on chain.
 */
export * from "./config/engineConfig";
export * from "./config/defaults";
export * from "./config/schema";

export * from "./pipeline/types";
export * from "./pipeline";
export * from "./pipeline/runFullPipeline";

export * from "./logging/logger";
export * from "./logging/metrics";

export * from "./utils/error";
export * from "./utils/env";
export * from "./utils/fsHelpers";
export * from "./utils/validation";
