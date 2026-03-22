#!/usr/bin/env node --experimental-strip-types
// CLI entry point for running WESL tests in an isolated Node process for wgsl-studio.
// Usage: node --experimental-strip-types runTestCli.ts '<json-params>'

import { destroySharedDevice, getGPUDevice, runWesl } from "./index.ts";

interface CliParams {
  src: string;
  projectDir: string;
  testNames?: string[];
  conditions?: Record<string, boolean>;
  constants?: Record<string, string | number>;
}

const params: CliParams = JSON.parse(process.argv[2]);
const device = await getGPUDevice();

const allResults = [];
for (const testName of params.testNames ?? [undefined]) {
  const results = await runWesl({ device, ...params, testName });
  allResults.push(...results);
}

destroySharedDevice();
console.log(JSON.stringify(allResults));
