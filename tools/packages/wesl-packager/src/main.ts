#!/usr/bin/env node
import { exit } from "node:process";
import { hideBin } from "yargs/helpers";
import { packagerCli } from "./PackagerCli.js";

const rawArgs = hideBin(process.argv);

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(
    `Please upgrade node to version 22 or higher. (The current node version is ${process.version})`,
  );
  exit(1);
}

packagerCli(rawArgs).catch(e => {
  console.error(e);
  exit(1);
});
