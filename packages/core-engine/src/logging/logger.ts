import type { LogLevel } from "../config/engineConfig";

export interface Logger {
  level: LogLevel;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createLogger(level: LogLevel): Logger {
  const order: LogLevel[] = ["silent", "error", "warn", "info", "debug"];
  const threshold = order.indexOf(level);

  function shouldLog(target: LogLevel): boolean {
    return order.indexOf(target) <= threshold && threshold > 0;
  }

  return {
    level,
    debug(message: string) {
      if (shouldLog("debug")) console.debug("[unit09][debug]", message);
    },
    info(message: string) {
      if (shouldLog("info")) console.info("[unit09][info]", message);
    },
    warn(message: string) {
      if (shouldLog("warn")) console.warn("[unit09][warn]", message);
    },
    error(message: string) {
      if (shouldLog("error")) console.error("[unit09][error]", message);
    }
  };
}
