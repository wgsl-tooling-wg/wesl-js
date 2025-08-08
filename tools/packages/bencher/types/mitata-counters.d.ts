declare module "@mitata/counters" {
  export interface CpuCountEntry {
    avg: number;
    min?: number;
    max?: number;
  }

  export interface CpuCounts {
    cycles?: {
      avg: number;
      stalls?: CpuCountEntry;
    };
    instructions?: {
      avg: number;
      loads_and_stores?: CpuCountEntry;
    };
    l1?: {
      miss_loads?: CpuCountEntry;
      miss_stores?: CpuCountEntry;
    };
    cache?: {
      avg: number;
      misses?: CpuCountEntry;
    };
    [key: string]: any;
  }
}
