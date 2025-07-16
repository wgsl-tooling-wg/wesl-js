#!/usr/bin/env node
import { argv } from "node:process";
import { hideBin } from "yargs/helpers";
import { cli } from "./cli.ts";

const rawArgs = hideBin(argv);

cli(rawArgs);
