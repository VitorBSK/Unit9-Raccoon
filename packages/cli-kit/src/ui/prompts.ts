/**
 * Very small interactive prompt helpers that use stdin/stdout directly.
 * These are intentionally minimal to avoid additional dependencies.
 */

export interface PromptOptions {
  defaultValue?: string;
}

export function askYesNo(question: string, defaultValue: boolean = true): Promise<boolean> {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  return new Promise((resolve) => {
    process.stdout.write(`${question} ${hint} `);
    const onData = (data: Buffer) => {
      const input = data.toString("utf-8").trim().toLowerCase();
      process.stdin.off("data", onData);
      if (!input) {
        resolve(defaultValue);
        return;
      }
      if (input === "y" || input === "yes") resolve(true);
      else if (input === "n" || input === "no") resolve(false);
      else resolve(defaultValue);
    };
    process.stdin.on("data", onData);
  });
}

export function askText(question: string, options: PromptOptions = {}): Promise<string> {
  return new Promise((resolve) => {
    const suffix = options.defaultValue ? ` (${options.defaultValue})` : "";
    process.stdout.write(`${question}${suffix}: `);
    const onData = (data: Buffer) => {
      const input = data.toString("utf-8").trim();
      process.stdin.off("data", onData);
      if (!input && options.defaultValue !== undefined) {
        resolve(options.defaultValue);
      } else {
        resolve(input);
      }
    };
    process.stdin.on("data", onData);
  });
}
