/**
 * Very lightweight metrics collector that maintains counters in memory.
 */
export interface CounterRegistry {
  increment(name: string, amount?: number): void;
  get(name: string): number;
}

export function createCounterRegistry(): CounterRegistry {
  const counters: Record<string, number> = {};

  return {
    increment(name: string, amount: number = 1) {
      counters[name] = (counters[name] ?? 0) + amount;
    },
    get(name: string) {
      return counters[name] ?? 0;
    }
  };
}
