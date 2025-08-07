#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { type BenchSuite, runBenchCLI } from "../../index.ts";

const suite: BenchSuite = {
  name: "Test",
  groups: [
    {
      name: "Math",
      benchmarks: [
        { name: "plus", fn: () => 1 + 1 },
        { name: "multiply", fn: () => 2 * 2 },
      ],
    },
    {
      name: "Array Math",
      setup: () => ({
        nums: [1, 2, 3, 4, 5],
      }),
      benchmarks: [
        {
          name: "array sum",
          fn: ({ nums }: any) =>
            nums.reduce((a: number, b: number) => a + b, 0),
        },
      ],
    },
  ],
};

runBenchCLI(suite);
