import { promises as fs } from "fs";
import { join, relative } from "path";

/**
 * Result for a file system scan.
 */
export interface FileScanEntry {
  absolutePath: string;
  relativePath: string;
  size: number;
}

/**
 * Recursively list files under a directory, up to a maximum count.
 */
export async function listFilesRecursive(
  rootDir: string,
  maxFiles: number
): Promise<FileScanEntry[]> {
  const results: FileScanEntry[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        if (results.length >= maxFiles) return;
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        results.push({
          absolutePath: fullPath,
          relativePath: relative(rootDir, fullPath),
          size: stat.size
        });
        if (results.length >= maxFiles) return;
      }
    }
  }

  await walk(rootDir);
  return results;
}
