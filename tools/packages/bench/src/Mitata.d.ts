declare module "@mitata/counters" {
  function init(): void;
  function deinit(): void;
  function after(): void;
  function before(): void;
  function translate(batch?: number, samples?: number): CpuCounts | undefined;

  interface CpuCounts {
    // macOS (darwin) specific
    l1?: {
      miss_loads?: CounterStats | null;
      miss_stores?: CounterStats | null;
    };
    cycles?: CounterStats & {
      stalls?: CounterStats;
    };
    branches?: CounterStats & {
      mispredicted?: CounterStats;
    } | null;
    instructions?: CounterStats & {
      loads_and_stores?: CounterStats | null;
    };

    // Linux specific
    cache?: CounterStats & {
      misses?: CounterStats | null;
    } | null;
    _bmispred?: CounterStats | null;
  }

  interface CounterStats {
    min: number;
    max: number;
    avg: number;
  }
}