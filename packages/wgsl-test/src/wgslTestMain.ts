#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import { cli } from "./WgslTestRunner.ts";

cli(hideBin(process.argv));
