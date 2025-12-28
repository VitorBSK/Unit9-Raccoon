import { createCliLogger, type LogLevel } from "@unit09/cli-kit";

export type CliLogger = ReturnType<typeof createCliLogger>;

export function createLogger(level: LogLevel = "info"): CliLogger {
  return createCliLogger(level);
}
