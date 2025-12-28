import type { GeneratedModule } from "../pipeline/types";

/**
 * Simple adaptor for representing modules as nodes in a higher-level graph.
 */
export interface ModuleGraphNode {
  id: string;
  label: string;
  fileCount: number;
}

export function buildModuleGraphNodes(modules: GeneratedModule[]): ModuleGraphNode[] {
  return modules.map((mod) => ({
    id: mod.id,
    label: mod.label,
    fileCount: mod.filePaths.length
  }));
}
