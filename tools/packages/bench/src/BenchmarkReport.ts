import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import { mapValues } from "./mitata-util/Util.ts";
import {
  floatPrecision as floatPrecisionImpl,
  integer as integerImpl,
  percent as percentImpl,
  percentPrecision as percentPrecisionImpl,
} from "./table-util/Formatters.ts";
import { buildTable, type ColumnGroup } from "./table-util/TableReport.ts";

const maxNameLength = 30;

/** Simple benchmark result for unified display */
interface SimpleBenchResult {
  name: string;
  opsPerSec: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
  rme?: number; // relative margin of error percentage
  p50?: number; // median latency
}

/** Generic benchmark report */
export interface BenchmarkReport {
  name: string;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
  metadata?: Record<string, any>;
}

export interface LogOptions {
  cpu?: boolean;
}

export function reportResults(
  reports: BenchmarkReport[],
  opts: LogOptions,
): void {
  const rows = reportsToRows(reports);
  logTable(rows, tableConfig(opts.cpu));
}

interface SelectedStats {
  name: string;
  mean?: number;
  p50?: number;
  p99?: number;
  runs?: number;
  lines?: number;
  kOps?: number;
  gc?: number;
  cpuCacheMiss?: number;
  cpuStall?: number;
  locSecP50?: number;
  locSecMax?: number;
}

interface ReportRow {
  name: string;
  mean?: number;
  p50?: number;
  p99?: number;
  runs?: number;
  lines?: number;
  kOps?: number;
  gc?: number;
  cpuCacheMiss?: number;
  cpuStall?: number;
  locSecP50?: number;
  locSecMax?: number;
  // Diff columns
  locSecP50Diff?: string;
  locSecMaxDiff?: string;
  meanDiff?: string;
  gcDiff?: string;
}

type NullableValues<T> = {
  [K in keyof T]: T[K] | null;
};

type FullReportRow = NullableValues<Required<ReportRow>>;

interface ReportRows {
  mainRecords: FullReportRow[];
  baselineRecords: FullReportRow[];
}

function reportsToRows(reports: BenchmarkReport[]): ReportRows {
  const mainRecords: FullReportRow[] = [];
  const baselineRecords: FullReportRow[] = [];

  for (const report of reports) {
    const stats = makeStatsRow(report.mainResult.name, report.mainResult, report.metadata);
    mainRecords.push(mostlyFullRow(stats));

    if (report.baseline) {
      const bStats = makeStatsRow(
        report.baseline.name,
        report.baseline,
        report.metadata,
      );
      baselineRecords.push(mostlyFullRow(bStats));
    }
  }
  return { mainRecords, baselineRecords };
}

function logTable(rows: ReportRows, columns: ColumnGroup<FullReportRow>[]): void {
  const { mainRecords, baselineRecords } = rows;
  // Only pass baseline records if they exist and have the same length as main records
  const baseline = baselineRecords.length === mainRecords.length ? baselineRecords : undefined;
  const tableString = buildTable(columns, mainRecords, baseline);
  console.log(tableString);
}

function makeStatsRow(
  name: string,
  results: MeasuredResults,
  metadata?: Record<string, any>,
): SelectedStats {
  // Truncate long names
  const displayName = name.length > maxNameLength
    ? name.slice(0, maxNameLength - 3) + "..."
    : name;

  // Use metadata for lines info
  const lines = metadata?.linesOfCode || 0;
  
  // Calculate ops/sec from time
  const kOps = results.time ? 1 / results.time.avg : undefined;

  // Calculate lines per second
  const locSecP50 = results.time?.p50
    ? lines / (results.time.p50 / 1000)
    : undefined;
  const locSecMax = results.time?.min
    ? lines / (results.time.min / 1000)
    : undefined; // min time = max throughput

  // Calculate average GC time per run
  let gcTime: number | undefined;
  if (results.nodeGcTime) {
    gcTime = results.nodeGcTime.inRun / results.samples.length;
  }

  return {
    name: displayName,
    mean: results.time?.avg,
    p50: results.time?.p50,
    p99: results.time?.p99,
    runs: results.samples.length,
    lines,
    kOps,
    gc: gcTime,
    cpuCacheMiss: results.cpuCacheMiss,
    cpuStall: results.cpuStall,
    locSecP50,
    locSecMax,
  };
}

function mostlyFullRow(stats: SelectedStats): FullReportRow {
  return {
    name: stats.name ?? null,
    mean: stats.mean ?? null,
    p50: stats.p50 ?? null,
    p99: stats.p99 ?? null,
    runs: stats.runs ?? null,
    lines: stats.lines ?? null,
    kOps: stats.kOps ?? null,
    gc: stats.gc ?? null,
    cpuCacheMiss: stats.cpuCacheMiss ?? null,
    cpuStall: stats.cpuStall ?? null,
    locSecP50: stats.locSecP50 ?? null,
    locSecMax: stats.locSecMax ?? null,
    // Diff columns will be filled by buildTable
    locSecP50Diff: null,
    locSecMaxDiff: null,
    meanDiff: null,
    gcDiff: null,
  };
}

function createNameColumn(): ColumnGroup<FullReportRow> {
  return {
    columns: [{ key: "name" as keyof FullReportRow, title: "name" }],
  };
}

function createLocColumns(): ColumnGroup<FullReportRow> {
  return {
    groupTitle: "lines / sec",
    columns: [
      {
        key: "locSecP50" as keyof FullReportRow,
        title: "p50",
        formatter: integer,
      },
      {
        key: "locSecP50Diff" as keyof FullReportRow,
        title: "Δ%",
        diffKey: "locSecP50" as keyof FullReportRow,
      },
      {
        key: "locSecMax" as keyof FullReportRow,
        title: "max",
        formatter: integer,
      },
      {
        key: "locSecMaxDiff" as keyof FullReportRow,
        title: "Δ%",
        diffKey: "locSecMax" as keyof FullReportRow,
      },
    ],
  };
}

function createTimeColumns(): ColumnGroup<FullReportRow> {
  return {
    groupTitle: "time",
    columns: [
      {
        key: "mean" as keyof FullReportRow,
        title: "mean",
        formatter: floatPrecision(2),
      },
      {
        key: "meanDiff" as keyof FullReportRow,
        title: "Δ%",
        diffKey: "mean" as keyof FullReportRow,
      },
    ],
  };
}

function createGcColumns(): ColumnGroup<FullReportRow> {
  return {
    groupTitle: "gc time",
    columns: [
      {
        key: "gc" as keyof FullReportRow,
        title: "mean",
        formatter: percent,
      },
      {
        key: "gcDiff" as keyof FullReportRow,
        title: "Δ%",
        diffKey: "gc" as keyof FullReportRow,
      },
    ],
  };
}

function createMiscColumns(): ColumnGroup<FullReportRow> {
  return {
    groupTitle: "misc",
    columns: [
      {
        key: "runs" as keyof FullReportRow,
        title: "runs",
        formatter: integer,
      },
    ],
  };
}

function createCpuColumns(): ColumnGroup<FullReportRow> {
  return {
    groupTitle: "cpu",
    columns: [
      {
        key: "cpuCacheMiss" as keyof FullReportRow,
        title: "L1 miss",
        formatter: percent,
      },
      {
        key: "cpuStall" as keyof FullReportRow,
        title: "stalls",
        formatter: percentPrecision(2),
      },
    ],
  };
}

function tableConfig(cpu?: boolean): ColumnGroup<FullReportRow>[] {
  const columns = [
    createNameColumn(),
    createLocColumns(),
    createTimeColumns(),
    createGcColumns(),
    createMiscColumns(),
  ];

  if (cpu) {
    columns.push(createCpuColumns());
  }

  return columns;
}

// Low-level utility functions at the bottom

/** Convert simple results to MeasuredResults for unified display */
function simpleBenchResultToMeasured(
  result: SimpleBenchResult,
): MeasuredResults {
  return {
    name: result.name,
    samples: Array(result.samples).fill(result.meanMs), // Approximate samples
    time: {
      min: result.minMs,
      max: result.maxMs,
      avg: result.meanMs,
      p25: result.meanMs, // Approximate percentiles
      p50: result.p50 ?? result.meanMs,
      p75: result.meanMs,
      p99: result.meanMs,
      p999: result.meanMs,
    },
  };
}

// Private wrapper functions to handle unknown types
function percent(value: unknown): string | null {
  return typeof value === "number" ? percentImpl(value) : null;
}

function percentPrecision(precision: number) {
  return (value: unknown): string | null =>
    typeof value === "number" ? percentPrecisionImpl(precision)(value) : null;
}

function integer(value: unknown): string | null {
  return typeof value === "number" ? integerImpl(value) : null;
}

function floatPrecision(precision: number) {
  return (value: unknown): string | null =>
    typeof value === "number" ? floatPrecisionImpl(precision)(value) : null;
}