import * as Plot from "@observablehq/plot";
import type { QQPoint } from "../data/VizTypes.ts";
import { chartConfig } from "./ChartUtil.ts";

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
    const minVal = Math.min(
      ...qqData.map(d => Math.min(d.theoretical, d.sample)),
    );
    const maxVal = Math.max(
      ...qqData.map(d => Math.max(d.theoretical, d.sample)),
    );

    const plot = Plot.plot({
      ...chartConfig,
      width: 400,
      height: 400,
      aspectRatio: 1,
      x: {
        label: "Theoretical Quantiles (ms)",
        labelAnchor: "center",
        domain: [minVal, maxVal],
        labelArrow: "none",
        tickFormat: formatQQ,
      },
      y: {
        label: "Sample Quantiles (ms)",
        labelAnchor: "center",
        labelArrow: "none",
        domain: [minVal, maxVal],
        tickFormat: formatQQ,
      },
      marks: [
        Plot.line(
          [
            [minVal, minVal],
            [maxVal, maxVal],
          ],
          { stroke: "gray", strokeDasharray: "4,2" },
        ),
        Plot.dot(qqData, {
          x: "theoretical",
          y: "sample",
          fill: "steelblue",
          title: d => `Sample: ${formatQQ(d.sample)}`,
        }),
      ],
    });

    container.appendChild(plot);
  } catch (error) {
    container.innerHTML = `<div class="error">Error rendering Q-Q plot: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

/** Format value for Q-Q plot axis based on magnitude */
function formatQQ(d: number): string {
  if (Math.abs(d) < 0.1) return d.toFixed(3);
  if (Math.abs(d) < 10) return d.toFixed(2);
  return d.toFixed(1);
}
