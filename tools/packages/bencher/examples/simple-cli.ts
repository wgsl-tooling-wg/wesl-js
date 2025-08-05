#!/usr/bin/env node --import tsx
import { type BenchSuite, runBenchCLI } from "../src/index.ts";

const suite: BenchSuite = {
  name: "String Operations",
  groups: [
    {
      name: "Concatenation",
      benchmarks: [
        { name: "plus", fn: () => "a" + "b", params: undefined },
        { name: "template", fn: () => `a${"b"}`, params: undefined },
      ],
    },
  ],
};

runBenchCLI(suite);
