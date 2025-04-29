#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { packagerCli } from "./PackagerCli.js";
import { exit } from "process";

const rawArgs = hideBin(process.argv);

packagerCli(rawArgs).catch(e => {
  console.error(e);
  exit(1)
});
