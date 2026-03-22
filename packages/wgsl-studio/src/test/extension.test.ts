import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ExtensionApi } from "../extension.ts";
import type { TestResult } from "../WeslTestController.ts";

const extensionId = "webgpu-tools.wgsl-studio";
const fixturePath = path.resolve(
  __dirname,
  "../../src/test/fixtures/simple.wesl",
);

async function getApi(): Promise<ExtensionApi> {
  const ext = vscode.extensions.getExtension<ExtensionApi>(extensionId)!;
  return ext.activate();
}

async function openFixture(): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument(fixturePath);
  await vscode.window.showTextDocument(doc);
  return doc;
}

test("extension activates", async () => {
  const ext = vscode.extensions.getExtension(extensionId);
  assert.ok(ext, "Extension should be found");
  await ext.activate();
  assert.ok(ext.isActive, "Extension should be active");
});

test("previewToyShader command registered", async () => {
  const commands = await vscode.commands.getCommands();
  assert.ok(
    commands.includes("wgsl.previewToyShader"),
    "wgsl.previewToyShader command should be registered",
  );
});

test("discovers @test functions in wesl files", async () => {
  const api = await getApi();
  const doc = await openFixture();
  await api.testController.parseTests(doc.uri, doc.getText());

  // Verify test items were discovered
  let testCount = 0;
  api.testController.items.forEach(fileItem => {
    testCount += fileItem.children.size;
  });
  assert.ok(
    testCount >= 2,
    `Should discover at least 2 tests, found ${testCount}`,
  );
});

test("runs @test functions via VS Code test controller", async () => {
  const api = await getApi();
  const doc = await openFixture();
  await api.testController.parseTests(doc.uri, doc.getText());

  // Collect test results
  const results: TestResult[] = [];
  const disposable = api.testController.onTestResult(r => results.push(r));

  // Run all tests via the test controller
  await api.testController.runAllTests();
  disposable.dispose();

  // Verify we got results and at least one passed
  assert.ok(
    results.length > 0,
    `Should have test results, got ${results.length}`,
  );
  const passed = results.filter(r => r.passed);
  assert.ok(
    passed.length > 0,
    `At least one test should pass, ${passed.length} passed`,
  );
});
