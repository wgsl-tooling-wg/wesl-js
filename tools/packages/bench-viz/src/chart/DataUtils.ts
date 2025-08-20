import type { BenchmarkGroup, BenchmarkResult } from "bencher/json";

export interface ChartDataPoint {
  name: string;
  sample: number;
  value: number;
  displayValue: number;
  isBaseline: boolean;
}

export interface HistogramDataPoint {
  value: number;
  name: string;
}

/** @return points for time series visualization */
export function prepareGroupData(group: BenchmarkGroup): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];

  if (group.baseline?.samples) {
    group.baseline.samples.forEach((value, iteration) => {
      data.push({
        name: `${group.baseline!.name} (baseline)`,
        sample: iteration,
        value,
        displayValue: -1, // converted later
        isBaseline: true,
      });
    });
  }

  group.benchmarks.forEach(benchmark => {
    if (benchmark.samples) {
      benchmark.samples.forEach((value, iteration) => {
        data.push({
          name: benchmark.name,
          sample: iteration,
          value,
          displayValue: -1, // converted later
          isBaseline: false,
        });
      });
    }
  });

  return data;
}

/** @return values and names for histogram binning */
export function prepareHistogramData(
  group: BenchmarkGroup,
): HistogramDataPoint[] {
  const { baseline, benchmarks } = group;

  let baselinePoints: HistogramDataPoint[] = [];
  if (baseline) {
    baselinePoints = baseline.samples.map(value => ({
      name: `${baseline.name} (baseline)`,
      value,
    }));
  }

  const mainPoints = benchmarks.flatMap(benchmark => {
    return benchmark.samples.map(value => ({
      value,
      name: benchmark.name,
    }));
  });

  return [...baselinePoints, ...mainPoints];
}

/** @return all benchmarks with baseline flag */
export function getAllBenchmarks(
  group: BenchmarkGroup,
): (BenchmarkResult & { isBaseline: boolean })[] {
  const benchmarks: (BenchmarkResult & { isBaseline: boolean })[] = [];

  if (group.baseline) {
    benchmarks.push({ ...group.baseline, isBaseline: true });
  }

  group.benchmarks.forEach(benchmark => {
    benchmarks.push({ ...benchmark, isBaseline: false });
  });

  return benchmarks;
}
