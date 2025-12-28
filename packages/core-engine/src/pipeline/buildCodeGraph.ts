import type { PipelineContext, CodeGraph, CodeGraphNode, CodeGraphEdge } from "./types";
import { addCheckpoint } from "./runFullPipeline";

/**
 * Build a simple code graph based on file paths.
 *
 * This is a placeholder implementation that represents each file as a node
 * and does not attempt deep static analysis. It can be extended to detect
 * imports, function calls, and other edges.
 */
export async function buildCodeGraph(ctx: PipelineContext): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  const project = ctx.working.project;
  const files = project?.files ?? [];

  const nodes: CodeGraphNode[] = files.map((file, index) => ({
    id: `node-${index}`,
    filePath: file.path
  }));

  const edges: CodeGraphEdge[] = [];

  const graph: CodeGraph = {
    nodes,
    edges
  };

  ctx.working.codeGraph = graph;
  ctx.graphId = `graph-${Date.now()}`;

  diagnostics.push(`Constructed code graph with ${nodes.length} nodes`);

  addCheckpoint(ctx, {
    stage: "build-code-graph",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  ctx.stage = "decompose-modules";
  return ctx;
}
