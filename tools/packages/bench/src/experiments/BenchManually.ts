import { _linkSync, type link } from "wesl";
import type { BenchTest } from "../../bin/bench.ts";
import { diffPercent } from "../table-util/Formatters.ts";
import * as process from "node:process";

/** manual benchmark testing w/o mitata */
export function benchManually(
  tests: BenchTest[],
  baselineLink: typeof link,
): void {
  const gc = (globalThis as any).gc || (() => {});
  console.log("gc is", (globalThis as any).gc ? "enabled" : "disabled");
  for (const test of tests) {
    const weslSrc = Object.fromEntries(test.files.entries());
    const rootModuleName = test.mainFile;
    const warmups = 10;
    const runs = 12;
    const times = Array<bigint>(runs).fill(0n);
    let baselineTime = 0;

    if (baselineLink) {
      for (let i = 0; i < warmups; i++) {
        baselineLink({ weslSrc, rootModuleName });
      }
      for (let i = 0; i < runs; i++) {
        gc();
        const start = process.hrtime.bigint();
        baselineLink({ weslSrc, rootModuleName });
        const time = process.hrtime.bigint() - start;
        times[i] = time;
      }
      baselineTime = medianTime(times);
    }

    for (let i = 0; i < warmups; i++) {
      // simpleTest(weslSrc);
      _linkSync({ weslSrc, rootModuleName });
    }

    for (let i = 0; i < runs; i++) {
      gc();
      const start = process.hrtime.bigint();
      _linkSync({ weslSrc, rootModuleName });
      const time = process.hrtime.bigint() - start;
      times[i] = time;
    }
    const mainTime = medianTime(times);

    const diff = diffPercent(mainTime, baselineTime);
    console.log(`main: ${mainTime}ms, baseline: ${baselineTime}ms, ${diff}`);
  }
}

function _meanTime(times: bigint[]): number {
  const total = times.reduce((acc, time) => acc + Number(time), 0);
  return total / times.length / 1e6;
}

function medianTime(times: bigint[]): number {
  const sorted = [...times].sort((a, b) =>
    a < b ? -1
    : a > b ? 1
    : 0,
  );
  const mid = Math.floor(sorted.length / 2);
  return Number(sorted[mid]) / 1e6;
}
