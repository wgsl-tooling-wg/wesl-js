import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";

const benchDir = path.resolve(import.meta.dirname, "..");
const benchCmd = "node --expose-gc --allow-natives-syntax bin/bench.ts";

interface ParsedTableData {
  hasTable: boolean;
  rows: ParsedRow[];
  headers: string[];
}

interface ParsedRow {
  name: string;
  p50: number;
  max: number;
  timeMean: number;
  hasNumbers: boolean;
}

function parseTableOutput(output: string): ParsedTableData {
  const lines = output.split("\n");
  const tableRows = lines.filter(line => line.includes("║"));

  if (tableRows.length === 0) {
    return { hasTable: false, rows: [], headers: [] };
  }

  const { headerRow, headerIndex } = findHeaderRow(tableRows);
  const headers = extractHeaders(headerRow);
  const dataRows = parseDataRows(tableRows, headerIndex);

  return { hasTable: true, rows: dataRows, headers };
}

function findHeaderRow(tableRows: string[]): {
  headerRow: string | undefined;
  headerIndex: number;
} {
  for (let i = 0; i < tableRows.length; i++) {
    if (tableRows[i].includes("name") && tableRows[i].includes("p50")) {
      return { headerRow: tableRows[i], headerIndex: i };
    }
  }
  return { headerRow: undefined, headerIndex: -1 };
}

function extractHeaders(headerRow: string | undefined): string[] {
  if (!headerRow) return [];

  return headerRow
    .split(/[│║]/)
    .map(cell => cell.trim())
    .filter(h => h.length > 0);
}

function parseDataRows(tableRows: string[], headerIndex: number): ParsedRow[] {
  const dataRows: ParsedRow[] = [];

  for (let i = 0; i < tableRows.length; i++) {
    if (i <= headerIndex || tableRows[i].includes("───")) {
      continue;
    }

    const parsedRow = parseTableRow(tableRows[i]);
    if (parsedRow) {
      dataRows.push(parsedRow);
    }
  }

  return dataRows;
}

function parseTableRow(row: string): ParsedRow | null {
  if (!row.includes("│") && !row.includes("║")) return null;

  const cells = row.split(/[│║]/).map(cell => cell.trim());
  const name = cells.find(c => c.length > 0 && !c.match(/^[\s\d.,%+-]+$/));

  if (!name || name.length === 0) return null;

  const { p50, max } = extractLinesPerSec(cells);
  const timeMean = extractTimeMean(cells);

  return {
    name,
    p50,
    max,
    timeMean,
    hasNumbers: /\d+/.test(row),
  };
}

function extractLinesPerSec(cells: string[]): { p50: number; max: number } {
  for (const cell of cells) {
    const matches = cell.match(/([\d,]+)\s+(?:[+-]?[\d.]*%?\s+)?([\d,]+)/);
    if (matches) {
      return {
        p50: Number.parseFloat(matches[1].replace(/,/g, "")),
        max: Number.parseFloat(matches[2].replace(/,/g, "")),
      };
    }
  }
  return { p50: 0, max: 0 };
}

function extractTimeMean(cells: string[]): number {
  for (let j = 2; j < cells.length; j++) {
    const match = cells[j].match(/^([\d.]+)\s*$/);
    if (match) {
      return Number.parseFloat(match[1]);
    }
  }
  return 0;
}

describe("bench integration tests", () => {
  test(
    "runs bench with minimal time and no baseline",
    { timeout: 15000 },
    () => {
      const output = execSync(`${benchCmd} --time 0.1 --no-baseline`, {
        encoding: "utf-8",
        cwd: benchDir,
      });

      const parsed = parseTableOutput(output);

      // Verify table structure
      expect(parsed.hasTable).toBe(true);
      expect(parsed.rows.length).toBeGreaterThan(0);
      expect(parsed.headers).toContain("name");
      expect(parsed.headers.join(" ")).toMatch(/p50.*max/); // lines/sec columns
      expect(parsed.headers).toContain("mean"); // time column

      // Verify data rows have numbers
      for (const row of parsed.rows) {
        expect(row.hasNumbers).toBe(true);
        expect(row.name).toBeTruthy();

        // Skip baseline rows for numeric checks
        if (!row.name.includes("baseline")) {
          expect(row.p50).toBeGreaterThan(0);
          expect(row.max).toBeGreaterThan(0);
          expect(row.timeMean).toBeGreaterThan(0);
        }
      }
    },
  );

  test("filter works correctly", { timeout: 10000 }, () => {
    const output = execSync(
      `${benchCmd} --time 0.1 --no-baseline --filter imports_only`,
      { encoding: "utf-8", cwd: benchDir },
    );

    const parsed = parseTableOutput(output);

    // Should only have imports_only test
    expect(parsed.hasTable).toBe(true);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(1);

    const testNames = parsed.rows.map(r => r.name);
    expect(testNames.some(name => name.includes("imports_only"))).toBe(true);

    // Should not have other tests
    expect(testNames.some(name => name.includes("particle"))).toBe(false);
    expect(testNames.some(name => name.includes("bevy"))).toBe(false);
  });

  test("output format validation", { timeout: 10000 }, () => {
    const output = execSync(
      `${benchCmd} --time 0.1 --no-baseline --filter imports_only`,
      { encoding: "utf-8", cwd: benchDir },
    );

    // Check for table borders
    expect(output).toMatch(/╔═+╤═+╤═+╤═+╤═+╗/);
    expect(output).toMatch(/╟─+┼─+┼─+┼─+┼─+╢/);
    expect(output).toMatch(/╚═+╧═+╧═+╧═+╧═+╝/);

    // Check for column separators
    expect(output).toMatch(/║.*│.*│.*│.*║/);

    // Check headers exist (gc time might be split across lines as "gc t" + "ime")
    expect(output).toMatch(/lines \/ sec/);
    expect(output).toMatch(/time/);
    expect(output).toMatch(/gc t|gc time/); // Handle split text
    expect(output).toMatch(/misc/);
  });

  test("multiple variants work", { timeout: 10000 }, () => {
    const output = execSync(
      `${benchCmd} --time 0.1 --no-baseline --filter imports_only --variant parse --variant tokenize`,
      { encoding: "utf-8", cwd: benchDir },
    );

    const parsed = parseTableOutput(output);

    expect(parsed.hasTable).toBe(true);

    // Should have variants with prefixes
    const testNames = parsed.rows.map(r => r.name);
    expect(testNames.some(name => name.includes("parse:"))).toBe(true);
    expect(testNames.some(name => name.includes("tokenize:"))).toBe(true);
  });

  test("handles errors gracefully", () => {
    // Test with invalid filter that matches nothing - should not throw
    const output = execSync(
      `${benchCmd} --time 0.1 --filter nonexistent_test`,
      { encoding: "utf-8", cwd: benchDir },
    );

    // Should produce empty table
    const parsed = parseTableOutput(output);
    expect(parsed.hasTable).toBe(true);
    expect(parsed.rows.length).toBe(0);
  });

  describe("worker mode tests", () => {
    test("worker mode with standard runner", { timeout: 15000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --time 0.1 --no-baseline --filter imports_only`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Check for worker log messages
      expect(output).toContain("[Worker] Running standard main benchmark");
      expect(output).toContain("with standard runner");

      // Verify table output
      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);
      expect(parsed.rows.length).toBeGreaterThan(0);

      // Verify data
      const mainRow = parsed.rows.find(r => r.name.includes("imports_only"));
      expect(mainRow).toBeDefined();
      expect(mainRow!.p50).toBeGreaterThan(0);
    });

    test("worker mode with tinybench runner", { timeout: 15000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --tinybench --time 0.1 --no-baseline --filter imports_only`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Check for worker log messages
      expect(output).toContain("[Worker] Running standard main benchmark");
      expect(output).toContain("with tinybench runner");

      // Verify table output
      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);
      expect(parsed.rows.length).toBeGreaterThan(0);
    });

    test("worker mode with manual runner", { timeout: 15000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --manual --time 0.1 --no-baseline --filter imports_only`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Check for worker log messages
      expect(output).toContain("[Worker] Running standard main benchmark");
      expect(output).toContain("with manual runner");

      // Verify table output
      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);
      expect(parsed.rows.length).toBeGreaterThan(0);
    });

    test("worker mode with vanilla mitata runner", { timeout: 15000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --mitata --time 0.1 --no-baseline --filter imports_only`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Check for vanilla mitata output format
      expect(output).toContain("--- Vanilla Mitata Native Output ---");
      expect(output).toContain("--- Standard Table Format ---");

      // Check for mitata's native display elements
      expect(output).toContain("benchmark");
      expect(output).toContain("avg (min … max)");
      expect(output).toContain("/iter");

      // Now vanilla mitata DOES work in worker mode and shows results
      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);
      expect(parsed.rows.length).toBeGreaterThan(0);

      // Verify it's showing actual benchmark results
      expect(output).toContain("imports_only");
      expect(output).toContain("lines / sec");
    });

    test("worker mode with baseline comparison", { timeout: 20000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --time 0.1 --baseline --filter imports_only`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Check for both main and baseline worker messages
      expect(output).toContain("[Worker] Running standard main benchmark");
      expect(output).toContain("[Worker] Running standard baseline benchmark");

      // Verify table has both results
      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);

      const testNames = parsed.rows.map(r => r.name);
      expect(
        testNames.some(
          name => name.includes("imports_only") && !name.includes("baseline"),
        ),
      ).toBe(true);
      expect(testNames.some(name => name.includes("baseline"))).toBe(true);
    });

    test("worker mode with multiple variants", { timeout: 20000 }, () => {
      const output = execSync(
        `${benchCmd} --worker --time 0.1 --no-baseline --filter imports_only --variant parse --variant tokenize`,
        { encoding: "utf-8", cwd: benchDir },
      );

      // Should see worker messages for each variant
      expect(output).toMatch(/\[Worker\].*parse.*imports_only/);
      expect(output).toMatch(/\[Worker\].*tokenize.*imports_only/);

      const parsed = parseTableOutput(output);
      expect(parsed.hasTable).toBe(true);

      const testNames = parsed.rows.map(r => r.name);
      expect(testNames.some(name => name.includes("(parse)"))).toBe(true);
      expect(testNames.some(name => name.includes("(tokenize)"))).toBe(true);
    });
  });
});
