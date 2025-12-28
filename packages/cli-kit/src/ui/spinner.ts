/**
 * Simple terminal spinner implementation with no external dependencies.
 */
export interface Spinner {
  start(text?: string): void;
  update(text: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
}

const FRAMES = ["-", "\\", "|", "/"];

export function createSpinner(initialText: string = ""): Spinner {
  let text = initialText;
  let frameIndex = 0;
  let timer: NodeJS.Timeout | null = null;

  function render() {
    const frame = FRAMES[frameIndex];
    frameIndex = (frameIndex + 1) % FRAMES.length;
    const line = `${frame} ${text}`;
    process.stdout.write(`\r${line}`);
  }

  function clearLine() {
    process.stdout.write("\r");
    process.stdout.write(" ".repeat(80));
    process.stdout.write("\r");
  }

  return {
    start(newText?: string) {
      if (newText !== undefined) text = newText;
      if (timer) return;
      timer = setInterval(render, 80);
    },
    update(newText: string) {
      text = newText;
    },
    succeed(doneText?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      clearLine();
      const msg = doneText ?? text;
      if (msg) process.stdout.write(`✔ ${msg}\n`);
    },
    fail(doneText?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      clearLine();
      const msg = doneText ?? text;
      if (msg) process.stdout.write(`✖ ${msg}\n`);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      clearLine();
    }
  };
}
