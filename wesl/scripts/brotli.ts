import fs from "fs";
import brotli from "brotli";
import process from "node:process";

const buffer = fs.readFileSync(process.argv[2]);
const compressed = brotli.compress(buffer);
console.log(compressed.length, "bytes");
