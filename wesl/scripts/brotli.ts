import { brotliCompressSync } from "node:zlib";

const buffer = await Deno.readTextFile(Deno.args[0]);
const compressed = brotliCompressSync(buffer, {});
console.log(compressed.length, "bytes");
