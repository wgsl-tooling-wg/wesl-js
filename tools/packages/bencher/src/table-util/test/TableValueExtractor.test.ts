import { expect, test } from "vitest";

import { extractValue } from "./TableValueExtractor.ts";

test("extract mean values from table with two column groups", () => {
  const table = `
╔═════════════════╤══════════════════════════╤═══════════════════════╗
║                 │           time           │         gc            ║
║                 │                          │                       ║
║ name            │ mean     p50       p99   │ mean     max          ║
╟─────────────────┼──────────────────────────┼───────────────────────╢
║ test1           │ 12.3     1.45      2.1   │ 8.7      89.1         ║
║ test2           │ 23.4     14.5      20.0  │ 15.6     102.5        ║
╚═════════════════╧══════════════════════════╧═══════════════════════╝
  `;

  // Extract mean from time group for both rows
  expect(extractValue(table, "test1", "mean", "time")).toBe(12.3);
  expect(extractValue(table, "test2", "mean", "time")).toBe(23.4);

  // Extract mean from gc group for both rows
  expect(extractValue(table, "test1", "mean", "gc")).toBe(8.7);
  expect(extractValue(table, "test2", "mean", "gc")).toBe(15.6);

  // Test other columns too
  expect(extractValue(table, "test1", "p99", "time")).toBe(2.1);
  expect(extractValue(table, "test1", "max", "gc")).toBe(89.1);
});

test("extract values from table with column title containing space", () => {
  const table = `
╔══════════════════╤══════════════════════════════╤══════════════════════╗
║                  │         lines / sec          │                      ║
║                  │                              │                      ║
║ name             │ max     Δ%     p50     Δ%    │ kb      L1 miss  N   ║
╟──────────────────┼──────────────────────────────┼──────────────────────╢
║ reduceBuffer     │ 77,045  -0.5%  74,351  -0.9% │ 2,044   1.6%     545 ║
║ unity_webgpu     │ 33,448  -1.4%  31,819  -3.9% │ 67,895  2.1%     12  ║
╚══════════════════╧══════════════════════════════╧══════════════════════╝
  `;

  // Extract L1 miss values (column title with space)
  expect(extractValue(table, "reduceBuffer", "L1 miss")).toBe(1.6);
  expect(extractValue(table, "unity_webgpu", "L1 miss")).toBe(2.1);
});
