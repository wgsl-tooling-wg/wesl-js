import type { BenchmarkJsonData } from "bencher/json";

export interface LoadedData {
  loading: boolean;
  data: BenchmarkJsonData | null;
}

/** Fetch benchmark results JSON from public directory */
export async function loadData(loaded: LoadedData): Promise<void> {
  try {
    const response = await fetch("/data/benchmark-results.json");
    loaded.data = await response.json();
  } catch (_error) {
    /** Silently fail - UI will show no data message */
  } finally {
    loaded.loading = false;
  }
}
