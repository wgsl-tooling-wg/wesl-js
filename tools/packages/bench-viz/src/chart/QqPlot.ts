import * as Plot from "@observablehq/plot";
import type { QQPoint } from "../data/VizTypes.ts";
import { chartConfig } from "./ChartUtil.ts";

interface ValueRange {
  min: number;
  max: number;
}

/** Render Q-Q plot to check normality of sample distribution */
export function renderQQPlotChart(
  container: HTMLElement,
  qqData: QQPoint[],
  _benchmarkName: string,
): void {
  container.innerHTML = "";

  if (qqData.length === 0) {
    container.innerHTML = '<div class="error">No Q-Q plot data available</div>';
    return;
  }

  try {
    const valueRange = calculateValueRange(qqData);
    const plot = createQQPlot(qqData, valueRange);
    container.appendChild(plot);
  } catch (error) {
    container.innerHTML = `<div class="error">Error rendering Q-Q plot: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

/** Find min/max across both theoretical and sample values */
function calculateValueRange(qqData: QQPoint[]): ValueRange {
  const min = Math.min(...qqData.map(d => Math.min(d.theoretical, d.sample)));
  const max = Math.max(...qqData.map(d => Math.max(d.theoretical, d.sample)));
  return { min, max };
}

/** Build Q-Q plot with diagonal reference line */
function createQQPlot(qqData: QQPoint[], valueRange: ValueRange) {
  return Plot.plot({
    ...chartConfig,
    width: 300,
    height: 300,
    x: {
      label: "Theoretical Quantiles (ms)",
      labelAnchor: "center",
      labelArrow: "none",
      domain: [valueRange.min, valueRange.max],
      tickFormat: formatQQ,
    },
    y: {
      label: "Sample Quantiles (ms)",
      labelAnchor: "center",
      labelArrow: "none",
      domain: [valueRange.min, valueRange.max],
      tickFormat: formatQQ,
    },
    marks: [createReferenceLine(valueRange), createDataPoints(qqData)],
  });
}

/** Diagonal line showing perfect normal distribution */
function createReferenceLine(valueRange: ValueRange) {
  return Plot.line(
    [
      [valueRange.min, valueRange.min],
      [valueRange.max, valueRange.max],
    ],
    { stroke: "gray", strokeDasharray: "4,2" },
  );
}

/** Plot actual vs theoretical quantiles */
function createDataPoints(qqData: QQPoint[]) {
  return Plot.dot(qqData, {
    x: "theoretical",
    y: "sample",
    fill: "steelblue",
    title: d => `Sample: ${formatQQ(d.sample)}`,
  });
}

/** Format numbers based on magnitude for readability */
function formatQQ(d: number): string {
  if (Math.abs(d) < 0.1) return d.toFixed(3);
  if (Math.abs(d) < 10) return d.toFixed(1);
  return d.toFixed(0);
}
