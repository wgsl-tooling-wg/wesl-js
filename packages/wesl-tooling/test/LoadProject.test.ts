import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "vitest";
import { loadProject } from "../src/LoadProject.ts";

test("loadProject returns project info for valid project", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wesl-loadproject-"));
  try {
    // Create minimal project structure
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "test-project" }),
    );
    const shadersDir = path.join(tempDir, "shaders");
    fs.mkdirSync(shadersDir);
    fs.writeFileSync(path.join(shadersDir, "main.wesl"), "fn main() {}");
    fs.writeFileSync(path.join(shadersDir, "util.wesl"), "fn helper() {}");

    const mainPath = path.join(shadersDir, "main.wesl");
    const result = await loadProject(mainPath);

    expect(result).not.toBeNull();
    expect(result?.packageName).toBe("test_project");
    expect(result?.rootModuleName).toBe("main.wesl");
    expect(result?.weslSrc).toHaveProperty("main.wesl");
    expect(result?.weslSrc).toHaveProperty("util.wesl");
    expect(result?.libs).toEqual([]);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test("loadProject computes rootModuleName for nested file", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wesl-loadproject-"));
  try {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "test-project" }),
    );
    const nestedDir = path.join(tempDir, "shaders", "effects");
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(nestedDir, "blur.wesl"), "fn blur() {}");

    const blurPath = path.join(nestedDir, "blur.wesl");
    const result = await loadProject(blurPath);

    expect(result).not.toBeNull();
    expect(result?.rootModuleName).toBe("effects/blur.wesl");
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test("loadProject returns null for file outside project", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wesl-no-project-"));
  try {
    // No package.json, no wesl.toml
    fs.writeFileSync(path.join(tempDir, "random.wesl"), "fn main() {}");

    const result = await loadProject(path.join(tempDir, "random.wesl"));
    expect(result).toBeNull();
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test("loadProject uses directory name when package.json has no name", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wesl-noname-"));
  try {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const shadersDir = path.join(tempDir, "shaders");
    fs.mkdirSync(shadersDir);
    fs.writeFileSync(path.join(shadersDir, "main.wesl"), "fn main() {}");

    const result = await loadProject(path.join(shadersDir, "main.wesl"));

    expect(result).not.toBeNull();
    // Falls back to directory basename
    expect(result?.packageName).toMatch(/^wesl-noname-/);
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
