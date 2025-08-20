import * as Plot from "@observablehq/plot";
import type { BenchmarkGroup } from "bencher/json";
import * as d3 from "d3";
import {
  chartConfig,
  convertToDisplayUnits,
  createColorRange,
  determineTimeUnit,
  extractNames,
  type TimeUnit,
} from "./ChartUtil.ts";
import { type ChartDataPoint, prepareGroupData } from "./DataUtils.ts";

interface YAxisRange {
  min: number;
  max: number;
}

/** Render sample times in collection order */
export function renderTimeSeriesChart(
  container: HTMLElement,
  group: BenchmarkGroup,
): void {
  container.innerHTML = "";

  if (!hasValidData(group)) {
    container.innerHTML =
      '<div class="error">No time series data available</div>';
    return;
  }

  try {
    const chartData = prepareGroupData(group);
    const timeUnit = determineTimeUnit(chartData.map(d => d.value));
    convertToDisplayUnits(chartData, timeUnit);

    const yAxis = calcYAxisRange(chartData.map(d => d.displayValue));
    const names = extractNames(group);
    const plot = createTimeSeriesPlot(chartData, timeUnit, yAxis, names);

    container.appendChild(plot);
  } catch (error) {
    container.innerHTML = `<div class="error">Error rendering time series: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

/** @return true if group contains sample data */
function hasValidData(group: BenchmarkGroup): boolean {
  return !!(
    group.baseline?.samples?.length ||
    group.benchmarks.some(b => b.samples?.length)
  );
}

/** @return scatter plot with series per benchmark */
function createTimeSeriesPlot(
  chartData: ChartDataPoint[],
  timeUnit: TimeUnit,
  yAxis: YAxisRange,
  names: string[],
) {
  return Plot.plot({
    marginLeft: 60,
    marginBottom: 40,
    style: chartConfig.style,
    color: {
      legend: true,
      range: createColorRange(names),
      domain: names,
    },
    x: {
      label: "Sample",
      labelAnchor: "center",
      labelArrow: "none",
      grid: true,
      domain: [0, d3.max(chartData, d => d.sample)!],
      tickFormat: d => d.toString(),
    },
    y: {
      label: `Time (${timeUnit.suffix})`,
      labelAnchor: "center",
      labelArrow: "none",
      grid: true,
      domain: [yAxis.min, yAxis.max],
      tickFormat: timeUnit.formatValue,
    },
    marks: [
      ...createMarks(names, chartData, timeUnit),
      Plot.ruleY([yAxis.min], { stroke: "black", strokeWidth: 1 }),
    ],
  });
}

/** @return dot marks for each benchmark series */
function createMarks(
  names: string[],
  chartData: ChartDataPoint[],
  timeUnit: TimeUnit,
) {
  return names.map(name => {
    const benchmarkData = chartData.filter(d => d.name === name);

    return Plot.dot(benchmarkData, {
      x: "sample",
      y: "displayValue",
      fill: "name",
      stroke: "name",
      strokeWidth: 2,
      r: 3,
      fillOpacity: d => (d.isBaseline ? 0 : 1),
      strokeOpacity: 1,
      title: d =>
        `${name}: Sample ${d.sample}: ${timeUnit.formatValue(d.displayValue)}${timeUnit.suffix}`,
    });
  });
}

/** @return y-axis bounds with padding */
function calcYAxisRange(values: number[]): YAxisRange {
  const dataMin = d3.min(values)!;
  const dataMax = d3.max(values)!;
  const dataRange = dataMax - dataMin;
  const padding = Math.max(dataRange * 0.15, dataRange * 0.1);

  let yMin = dataMin - padding;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(yMin)));
  yMin = Math.floor(yMin / magnitude) * magnitude;

  if (dataMin > 0 && yMin < 0) yMin = 0;
  const yMax = dataMax + dataRange * 0.05;

  return { min: yMin, max: yMax };
}
