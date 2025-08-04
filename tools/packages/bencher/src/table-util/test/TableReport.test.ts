import { test } from "vitest";
import { expectTrimmedMatch } from "vitest-util";
import { integer } from "../Formatters.ts";
import {
  buildTable,
  type ColumnGroup,
  type ResultGroup,
} from "../TableReport.ts";

test("buildTable creates table with name, lines/sec, and kb/L1/N sections", () => {
  interface TestRecord {
    name: string;
    max: number;
    maxDelta?: string;
    p50: number;
    p50Delta?: string;
    kb: number;
    l1miss: string;
    n: number;
  }

  const columnGroups: ColumnGroup<TestRecord>[] = [
    {
      columns: [{ key: "name", title: "name", alignment: "left" }],
    },
    {
      groupTitle: "lines / sec",
      columns: [
        { key: "max", title: "max", alignment: "right", formatter: integer },
        { key: "maxDelta", title: "Δ%", alignment: "right", diffKey: "max" },
        { key: "p50", title: "p50", alignment: "right", formatter: integer },
        { key: "p50Delta", title: "Δ%", alignment: "right", diffKey: "p50" },
      ],
    },
    {
      columns: [
        { key: "kb", title: "kb", alignment: "right", formatter: integer },
        { key: "l1miss", title: "L1 miss", alignment: "right" },
        { key: "n", title: "N", alignment: "right" },
      ],
    },
  ];

  const mainData: TestRecord[] = [
    {
      name: "reduceBuffer",
      max: 77045,
      p50: 74351,
      kb: 2044,
      l1miss: "1.6%",
      n: 545,
    },
    {
      name: "unity_webgpu",
      max: 33448,
      p50: 31819,
      kb: 67895,
      l1miss: "2.1%",
      n: 12,
    },
  ];

  const baselineData: TestRecord[] = [
    {
      name: "reduceBuffer",
      max: 77463,
      p50: 75044,
      kb: 2026,
      l1miss: "1.6%",
      n: 556,
    },
    {
      name: "unity_webgpu",
      max: 33925,
      p50: 33107,
      kb: 69808,
      l1miss: "2.0%",
      n: 12,
    },
  ];

  // Create result groups - each main record paired with its corresponding baseline
  const resultGroups: ResultGroup<TestRecord>[] = mainData.map((main, i) => ({
    results: [main],
    baseline: baselineData[i],
  }));

  const result = buildTable(columnGroups, resultGroups);
  const expected = `
      ╔══════════════════╤══════════════════════════════╤══════════════════════╗
      ║                  │         lines / sec          │                      ║
      ║                  │                              │                      ║
      ║ name             │ max     Δ%     p50     Δ%    │ kb      L1 miss  N   ║
      ╟──────────────────┼──────────────────────────────┼──────────────────────╢
      ║ reduceBuffer     │ 77,045  -0.5%  74,351  -0.9% │ 2,044   1.6%     545 ║
      ║ --> reduceBuffer │ 77,463         75,044        │ 2,026   1.6%     556 ║
      ║                  │                              │                      ║
      ║ unity_webgpu     │ 33,448  -1.4%  31,819  -3.9% │ 67,895  2.1%     12  ║
      ║ --> unity_webgpu │ 33,925         33,107        │ 69,808  2.0%     12  ║
      ╚══════════════════╧══════════════════════════════╧══════════════════════╝
  `;
  expectTrimmedMatch(result, expected);
});
