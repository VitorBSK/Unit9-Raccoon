import type { EngineConfigInput, LogLevel } from "./engineConfig";
import { EngineConfigError } from "../utils/error";

/**
 * Simple runtime validation for EngineConfigInput.
 * This is not a full schema library, but a pragmatic guard.
 */
export function validateEngineConfigInput(input: EngineConfigInput): void {
  if (!input) return;

  if (input.logLevel && !isValidLogLevel(input.logLevel)) {
    throw new EngineConfigError(`Invalid log level: ${input.logLevel}`);
  }

  if (input.source?.maxFiles !== undefined && input.source.maxFiles <= 0) {
    throw new EngineConfigError("source.maxFiles must be greater than zero");
  }

  if (
    input.modules?.maxModulesPerRepo !== undefined &&
    input.modules.maxModulesPerRepo <= 0
  ) {
    throw new EngineConfigError("modules.maxModulesPerRepo must be greater than zero");
  }
}

function isValidLogLevel(level: string): level is LogLevel {
  return ["silent", "error", "warn", "info", "debug"].includes(level);
}
