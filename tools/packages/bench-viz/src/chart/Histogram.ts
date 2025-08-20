import * as Plot from "@observablehq/plot";
import type { BenchmarkGroup } from "bencher/json";
import * as d3 from "d3";
import {
  chartConfig,
  createColorRange,
  determineTimeUnit,
  extractNames,
  type TimeUnit,
} from "./ChartUtil.ts";
import { getAllBenchmarks, prepareHistogramData } from "./DataUtils.ts";

interface BinConfig {
  min: number;
  max: number;
  bins: number[];
  maxCount: number;
  timeUnit: TimeUnit;
}

/** Render frequency histogram for benchmark times */
export function renderHistogramChart(
  container: HTMLElement,
  group: BenchmarkGroup,
): void {
  container.innerHTML = "";

  if (!hasValidData(group)) {
    container.innerHTML = '<div class="error">No sample data available</div>';
    return;
  }

  try {
    const binConfig = calcBinConfig(group);
    const names = extractNames(group);
    const plot = createHistogramPlot(group, binConfig, names);

    container.appendChild(plot);
  } catch (error) {
    container.innerHTML = `<div class="error">Error rendering histogram: ${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

/** @return true if group contains sample data */
function hasValidData(group: BenchmarkGroup): boolean {
  return !!(
    group.baseline?.samples?.length ||
    group.benchmarks.some(b => b.samples?.length)
  );
}

/** @return histogram plot with overlapping series */
function createHistogramPlot(
  group: BenchmarkGroup,
  binConfig: BinConfig,
  names: string[],
) {
  return Plot.plot({
    ...chartConfig,
    className: "histogram-plot",
    color: {
      legend: true,
      range: createColorRange(names),
      domain: names,
    },
    x: {
      label: `Time (${binConfig.timeUnit.suffix})`,
      labelArrow: false,
      labelAnchor: "center",
      domain: [
        binConfig.min,
        Math.max(binConfig.max, binConfig.bins[binConfig.bins.length - 1]),
      ],
      tickFormat: binConfig.timeUnit.formatValue,
    },
    y: {
      label: "Count",
      grid: true,
      labelArrow: false,
      labelAnchor: "center",
      domain: [0, binConfig.maxCount],
    },
    marks: [...createMarks(group, binConfig), Plot.ruleY([0])],
  });
}

/** @return bin edges and max count for y-axis */
function calcBinConfig(group: BenchmarkGroup): BinConfig {
  const allValues = extractAllValues(group);
  const timeUnit = determineTimeUnit(allValues);

  const displayValues = allValues.map(v => timeUnit.convertValue(v));
  const [min, max] = d3.extent(displayValues) as [number, number];
  const bins = createBinThresholds(min, max);
  const maxCount = calculateMaxCount(
    group,
    displayValues,
    min,
    max,
    bins,
    timeUnit,
  );

  return { min, max, bins, maxCount, timeUnit };
}

/** @return all sample values from group */
function extractAllValues(group: BenchmarkGroup): number[] {
  const values: number[] = [];

  if (group.baseline?.samples) {
    values.push(...group.baseline.samples);
  }

  group.benchmarks.forEach(benchmark => {
    if (benchmark.samples) {
      values.push(...benchmark.samples);
    }
  });

  return values;
}

function createBinThresholds(min: number, max: number): number[] {
  const binCount = 30;
  const rangeExtension = (max - min) * 0.01;
  const extendedMax = max + rangeExtension;
  const binWidth = (extendedMax - min) / binCount;

  return d3.range(binCount + 1).map(i => min + i * binWidth);
}

/** @return highest bin count for y-axis domain */
function calculateMaxCount(
  group: BenchmarkGroup,
  _displayValues: number[],
  min: number,
  max: number,
  bins: number[],
  timeUnit: TimeUnit,
): number {
  const allBenchmarks = getAllBenchmarks(group);
  const allCounts = allBenchmarks.flatMap(benchmark => {
    if (!benchmark.samples) return [];
    const convertedSamples = benchmark.samples.map(v =>
      timeUnit.convertValue(v),
    );
    const histogram = d3.bin().domain([min, max]).thresholds(bins)(
      convertedSamples,
    );
    return histogram.map(bin => bin.length);
  });

  return d3.max(allCounts) || 10;
}

/** @return histogram marks */
function createMarks(group: BenchmarkGroup, binConfig: BinConfig) {
  const allData = prepareHistogramData(group);

  if (allData.length === 0) {
    return [];
  }

  for (const d of allData) {
    d.value = binConfig.timeUnit.convertValue(d.value);
  }

  const histogram = createHistogramMark(allData, binConfig);

  return [histogram];
}

/** @return overlapping histogram bars with transparency */
function createHistogramMark(
  allData: ReturnType<typeof prepareHistogramData>,
  binConfig: BinConfig,
) {
  return Plot.rectY(
    allData,
    Plot.binX({ y2: "count" }, {
      // y2 prevents stacking, allows overlaps
      x: "value",
      fill: "name",
      thresholds: binConfig.bins,
      fillOpacity: 0.6,
      mixBlendMode: "multiply", // makes overlaps darker
    } as Plot.BinXInputs<Plot.RectYOptions>),
  );
}
