import type { CodeGraph, CodeGraphNode, CodeGraphEdge } from "../pipeline/types";

/**
 * Utility helpers for working with code graphs.
 */
export function createEmptyGraph(): CodeGraph {
  return {
    nodes: [],
    edges: []
  };
}

export function addNode(graph: CodeGraph, node: CodeGraphNode): void {
  graph.nodes.push(node);
}

export function addEdge(graph: CodeGraph, edge: CodeGraphEdge): void {
  graph.edges.push(edge);
}
