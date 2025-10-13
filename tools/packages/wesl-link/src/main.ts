#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { cli } from "./LinkCli.ts";

const rawArgs = hideBin(process.argv);

cli(rawArgs);
