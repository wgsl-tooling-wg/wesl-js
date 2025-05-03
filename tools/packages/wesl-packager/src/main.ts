#!/usr/bin/env node
import { exit } from "process";
import { hideBin } from "yargs/helpers";
import { packagerCli } from "./PackagerCli.js";

const rawArgs = hideBin(process.argv);

packagerCli(rawArgs).catch(e => {
  console.error(e);
  exit(1);
});
