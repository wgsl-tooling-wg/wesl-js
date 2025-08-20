import type { PlotOptions } from "@observablehq/plot";
import * as d3 from "d3";

export interface TimeUnit {
  suffix: string;
  convertValue: (ms: number) => number;
  formatValue: (d: number) => string;
}

/** Shared configuration for charts */
export const chartConfig: Partial<PlotOptions> = {
  marginBottom: 40,
  marginLeft: 50,
  width: 550,
  height: 300,
  style: { fontSize: "12px" },
};

/** @return colors for benchmarks: gray for baselines, Tableau10 for others */
export function createColorRange(names: string[]): string[] {
  const tableau10 = d3.schemeTableau10;
  let colorIndex = 0;

  return names.map((name: string) =>
    name.includes("(baseline)")
      ? "#c0c0c0"
      : tableau10[colorIndex++ % tableau10.length],
  );
}

/** @return all benchmark names including baseline with suffix */
export function extractNames(group: {
  baseline?: { name: string } | null;
  benchmarks: { name: string }[];
}): string[] {
  const names: string[] = [];
  if (group.baseline) {
    names.push(`${group.baseline.name} (baseline)`);
  }
  group.benchmarks.forEach(b => names.push(b.name));
  return names;
}

/** @return appropriate time unit based on data magnitude */
export function determineTimeUnit(values: number[]): TimeUnit {
  const avgVal = d3.mean(values)!;

  if (avgVal < 0.001) {
    return createNanosecondsUnit();
  }
  if (avgVal < 1) {
    return createMicrosecondsUnit();
  }
  return createMillisecondsUnit();
}

/** Convert millisecond values to display units in-place */
export function convertToDisplayUnits<
  T extends { value: number; displayValue?: number },
>(data: T[], timeUnit: TimeUnit): void {
  for (const d of data) {
    d.displayValue = timeUnit.convertValue(d.value);
  }
}

function createNanosecondsUnit(): TimeUnit {
  return {
    suffix: "ns",
    convertValue: ms => ms * 1000000,
    formatValue: d => d3.format(",.0f")(d),
  };
}

function createMicrosecondsUnit(): TimeUnit {
  return {
    suffix: "μs",
    convertValue: ms => ms * 1000,
    formatValue: d => d3.format(",.1f")(d),
  };
}

function createMillisecondsUnit(): TimeUnit {
  return {
    suffix: "ms",
    convertValue: ms => ms,
    formatValue: d => d3.format(",.1f")(d),
  };
}
