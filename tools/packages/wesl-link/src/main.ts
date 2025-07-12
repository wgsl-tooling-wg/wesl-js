#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { cli } from "./cli.ts";
import { argv } from "node:process";

const rawArgs = hideBin(argv);

cli(rawArgs);
