#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import brotli from "brotli";

const buffer = fs.readFileSync(process.argv[2]);
const compressed = brotli.compress(buffer);
console.log(compressed.length, "bytes");
