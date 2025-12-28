import type { GeneratedModule } from "../pipeline/types";

/**
 * Helper for generating a minimal module scaffold. The core-engine does not
 * write files to disk directly; instead it returns virtual file contents
 * that can be persisted by a caller.
 */
export function createModuleScaffold(module: GeneratedModule): string {
  const lines: string[] = [];
  lines.push(`// Auto-generated scaffold for module: ${module.label}`);
  lines.push("// You can edit this file to add custom initialization logic.");
  lines.push("");
  lines.push("export function setupModule() {");
  lines.push("  // TODO: add your module bootstrap logic here.");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}
