import * as simpleTests from "../src/experiments/SimpleTests.ts";
import { loadBenchmarkFiles } from "../src/LoadBenchmarks.ts";


export interface SimpleTest {
  fn: (weslSrc: Record<string, string>) => any;
  name: string;
}

export function loadSimpleTest(simpleSelect: string | undefined): SimpleTest {
  if (!simpleSelect) {
    console.error("No test name prefix provided for --simple");
    process.exit(1);
  }

  const testEntry = Object.entries(simpleTests).find(([name]) =>
    name.startsWith(simpleSelect),
  );

  if (!testEntry) {
    console.error(
      `No test found with prefix '${simpleSelect}' in SimpleTests.ts`,
    );
    console.error(`Available tests: ${Object.keys(simpleTests).join(", ")}`);
    process.exit(1);
  }
  const [name, fn] = testEntry;
  return { name, fn };
}

export async function loadSimpleFiles(): Promise<Record<string, string>> {
  const loadedTests = await loadBenchmarkFiles();
  const weslSrc = Object.fromEntries(
    loadedTests.flatMap(t => Array.from(t.files.entries())),
  );
  return weslSrc;
}
