import { promises as fs } from "fs";
import { dirname, resolve } from "path";

/**
 * Snapshot helpers can be used to persist structured JSON snapshots
 * for regression testing.
 */
export interface SnapshotOptions {
  dir?: string;
}

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function writeJsonSnapshot(
  name: string,
  value: unknown,
  options: SnapshotOptions = {}
): Promise<string> {
  const dir = options.dir ?? resolve(process.cwd(), "__snapshots__");
  const filePath = resolve(dir, `${name}.json`);
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), { encoding: "utf-8" });
  return filePath;
}

export async function readJsonSnapshot<T = unknown>(
  name: string,
  options: SnapshotOptions = {}
): Promise<T | null> {
  const dir = options.dir ?? resolve(process.cwd(), "__snapshots__");
  const filePath = resolve(dir, `${name}.json`);
  try {
    const buf = await fs.readFile(filePath);
    return JSON.parse(buf.toString("utf-8")) as T;
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
