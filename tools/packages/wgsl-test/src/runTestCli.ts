#!/usr/bin/env node --experimental-strip-types
// CLI entry point for running a single WESL test in an isolated Node process.
// Usage: node --experimental-strip-types runTestCli.ts '<json-params>'

import { destroySharedDevice, getGPUDevice, runWesl } from "./index.ts";

interface CliParams {
  src: string;
  projectDir: string;
  testName?: string;
  conditions?: Record<string, boolean>;
  constants?: Record<string, string | number>;
}

const params: CliParams = JSON.parse(process.argv[2]);
const device = await getGPUDevice();
const results = await runWesl({ device, ...params });
destroySharedDevice();
console.log(JSON.stringify(results));
