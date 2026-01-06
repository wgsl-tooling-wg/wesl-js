#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { brotliCompressSync } from "node:zlib";

const buffer = readFileSync(process.argv[2]);
const compressed = brotliCompressSync(buffer);
console.log(compressed.length, "bytes");
