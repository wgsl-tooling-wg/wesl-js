import * as mitata from "mitata";
import { _linkSync, type link } from "wesl";
import type { BenchTest } from "../../bin/bench.ts";

export function simpleMitataBench(
  tests: BenchTest[],
  baselineLink: typeof link,
): void {
  for (const test of tests) {
    const weslSrc = Object.fromEntries(test.files.entries());
    const rootModuleName = test.mainFile;

    // no way to pass options to mitata.bench, unfortunately
    mitata.bench(test.name, () => _linkSync({ weslSrc, rootModuleName }));
    mitata.bench("--> baseline " + test.name, () =>
      baselineLink({ weslSrc, rootModuleName }),
    );
  }
  mitata.run();
}
