import type { PipelineContext } from "./types";
import { addCheckpoint } from "./runFullPipeline";

/**
 * Interface that callers can implement to define how modules are synced
 * to the on-chain Unit09 program. This keeps the engine independent from
 * a specific SDK implementation.
 */
export interface SyncOnChainAdapter {
  sync(ctx: PipelineContext): Promise<void>;
}

/**
 * No-op adapter used as a default when no on-chain sync is configured.
 */
export class NoopSyncOnChainAdapter implements SyncOnChainAdapter {
  async sync(): Promise<void> {
    // Intentionally empty.
  }
}

/**
 * Perform the sync-on-chain step by delegating to the provided adapter.
 */
export async function syncOnChain(
  ctx: PipelineContext,
  adapter: SyncOnChainAdapter
): Promise<PipelineContext> {
  const start = Date.now();
  const diagnostics: string[] = [];

  await adapter.sync(ctx);
  diagnostics.push("Sync on chain completed");

  addCheckpoint(ctx, {
    stage: "sync-on-chain",
    startedAt: start,
    completedAt: Date.now(),
    diagnostics
  });

  return ctx;
}
