import { promises as fs } from "fs";
import { dirname } from "path";

/**
 * Ensure that a directory exists, creating it recursively if needed.
 */
export async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

/**
 * Write a UTF-8 text file, creating parent directories as needed.
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  await fs.writeFile(path, content, { encoding: "utf-8" });
}

/**
 * Read a UTF-8 text file if it exists.
 */
export async function readTextFile(path: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(path);
    return buf.toString("utf-8");
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
