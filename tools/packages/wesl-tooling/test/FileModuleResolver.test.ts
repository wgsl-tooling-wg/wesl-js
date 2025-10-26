import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import { FileModuleResolver } from "../src/FileModuleResolver.ts";

test("FileModuleResolver uses debugWeslRoot for error paths", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wesl-test-"));
  try {
    const testFile = path.join(tempDir, "main.wesl");
    fs.writeFileSync(testFile, "fn main() { }");

    const resolver = new FileModuleResolver(
      tempDir,
      "package",
      "shaders", // no trailing slash
    );

    const ast = resolver.resolveModule("package::main");
    expect(ast).toBeDefined();
    expect(ast!.srcModule.debugFilePath).toBe("shaders/main.wesl");
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
