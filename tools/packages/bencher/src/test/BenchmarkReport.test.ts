import { expect, test } from "vitest";
import { expectTrimmedMatch } from "vitest-util";
import {
  type BenchmarkReport,
  reportResults,
  valuesForReports,
} from "../BenchmarkReport.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import { gcSection, timeSection } from "../StandardSections.ts";

function createMockResults(
  overrides?: Partial<MeasuredResults>,
): MeasuredResults {
  return {
    name: "test",
    samples: [1, 2, 3],
    time: {
      min: 1.0,
      max: 3.0,
      avg: 1.5,
      p50: 1.4,
      p75: 1.8,
      p99: 2.1,
      p999: 2.5,
    },
    nodeGcTime: {
      inRun: 0.09,
      before: 0.01,
      after: 0.02,
      total: 0.12,
      collects: 3,
    },
    ...overrides,
  };
}

test("combines column sections correctly", () => {
  const sections = [timeSection, gcSection] as const;
  const reports: BenchmarkReport[] = [
    {
      name: "test",
      measuredResults: createMockResults(),
    },
  ];

  const rows = valuesForReports(reports, sections);

  expect(rows[0].name).toBe("test");
  expect(rows[0].mean).toBe(1.5);
  expect(rows[0].p50).toBe(1.4);
  expect(rows[0].p99).toBe(2.1);
  expect(rows[0].gc).toBeCloseTo(0.02, 2);
});

test("generates diff columns for baseline comparison", () => {
  const group1Reports: BenchmarkReport[] = [
    {
      name: "version1",
      measuredResults: createMockResults({
        time: { ...createMockResults().time!, avg: 1.5, p50: 1.45, p99: 2.0 },
      }),
    },
    {
      name: "version2",
      measuredResults: createMockResults({
        time: { ...createMockResults().time!, avg: 15.5, p50: 14.5, p99: 20.0 },
      }),
    },
  ];

  const baseline: BenchmarkReport = {
    name: "baseVersion",
    measuredResults: createMockResults({
      time: { ...createMockResults().time!, avg: 1.2, p50: 1.5, p99: 1.9 },
    }),
  };

  const group2Reports: BenchmarkReport[] = [
    {
      name: "test3",
      measuredResults: createMockResults({
        time: { ...createMockResults().time!, avg: 2.5, p50: 2.45, p99: 3.0 },
      }),
    },
    {
      name: "test4",
      measuredResults: createMockResults({
        time: { ...createMockResults().time!, avg: 3.5, p50: 3.45, p99: 4.0 },
      }),
    },
  ];

  const groups = [
    { reports: group1Reports, baseline: baseline },
    { reports: group2Reports },
  ];

  const table = reportResults(groups, [timeSection]);
  const expected = `
    ╔═════════════════╤══════════════════════════════════════════════╗
    ║                 │                     time                     ║
    ║                 │                                              ║
    ║ name            │ mean  Δ%        p50   Δ%       p99   Δ%      ║
    ╟─────────────────┼──────────────────────────────────────────────╢
    ║ version1        │ 1.50  +25.0%    1.45  -3.3%    2.00  +5.3%   ║
    ║ version2        │ 16    +1191.7%  15    +866.7%  20    +952.6% ║
    ║ --> baseVersion │ 1.20            1.50           1.90          ║
    ║                 │                                              ║
    ║ test3           │ 2.50            2.45           3.00          ║
    ║ test4           │ 3.50            3.45           4.00          ║
    ╚═════════════════╧══════════════════════════════════════════════╝`;
  expectTrimmedMatch(table, expected);
});
