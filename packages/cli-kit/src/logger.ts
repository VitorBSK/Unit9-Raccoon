export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

export interface CliLogger {
  level: LogLevel;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

function shouldLog(current: LogLevel, target: LogLevel): boolean {
  const order: LogLevel[] = ["silent", "error", "warn", "info", "debug"];
  return order.indexOf(target) <= order.indexOf(current) && current !== "silent";
}

function formatMessage(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}][${level.toUpperCase()}] ${message}`;
}

export function createCliLogger(level: LogLevel = "info"): CliLogger {
  return {
    level,
    debug(message: string) {
      if (shouldLog(level, "debug")) {
        process.stdout.write(formatMessage("debug", message) + "\n");
      }
    },
    info(message: string) {
      if (shouldLog(level, "info")) {
        process.stdout.write(formatMessage("info", message) + "\n");
      }
    },
    warn(message: string) {
      if (shouldLog(level, "warn")) {
        process.stderr.write(formatMessage("warn", message) + "\n");
      }
    },
    error(message: string) {
      if (shouldLog(level, "error")) {
        process.stderr.write(formatMessage("error", message) + "\n");
      }
    }
  };
}
