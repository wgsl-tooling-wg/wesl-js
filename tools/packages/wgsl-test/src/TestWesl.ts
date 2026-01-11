import { type LinkParams, parseSrcModule, type WeslBundle } from "wesl";
import { compileShader } from "./CompileShader.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";
import { type ComputeTestParams, runCompute } from "./TestComputeShader.ts";
import { findTestFunctions, type TestFunctionInfo } from "./TestDiscovery.ts";
import { testResultSize } from "./TestVirtualLib.ts";
import { importVitest } from "./VitestImport.ts";

/** Parameters for running @test functions in a WESL module. */
export type RunWeslParams = Omit<
  ComputeTestParams,
  "resultFormat" | "size" | "dispatchWorkgroups"
> & {
  /** Run only the @test function with this name */
  testName?: string;
};

/** Result from running a single @test function on the GPU. */
export interface TestResult {
  name: string;
  passed: boolean;
  actual: number[];
  expected: number[];
}

/** Parameters for testWesl() which registers all @test functions with vitest. */
export type TestWeslParams = Omit<RunWeslParams, "testName">;

/** Internal params for executing one @test function as a compute shader. */
interface RunSingleTestParams {
  testFn: TestFunctionInfo;
  shaderSrc: string;
  projectDir?: string;
  device: GPUDevice;
  conditions?: LinkParams["conditions"];
  constants?: LinkParams["constants"];
  useSourceShaders?: boolean;
}

/** Parsed WESL source with its AST for test discovery. */
interface ParsedTestModule {
  shaderSrc: string;
  ast: ReturnType<typeof parseSrcModule>;
}

// Auto-inject the wgsl-test shader library bundle
let cachedWeslBundle: WeslBundle;

/**
 * Discovers @test functions in a WESL module and registers each as a vitest test.
 * Use top-level await in your test file to call this function.
 */
export async function testWesl(params: TestWeslParams): Promise<void> {
  const { test } = await importVitest();
  const { ast } = await parseTestModule(params);
  const testFns = findTestFunctions(ast);
  for (const fn of testFns) {
    const testLabel = fn.description ?? fn.name;
    test(testLabel, async () => {
      await expectWesl({ ...params, testName: fn.name });
    });
  }
}

/**
 * Runs all @test functions and asserts they pass.
 * Throws descriptive error on failure showing test name and actual/expected values.
 */
export async function expectWesl(params: RunWeslParams): Promise<void> {
  const results = await runWesl(params);
  const failures = results.filter(r => !r.passed);

  if (failures.length > 0) {
    const messages = failures.map(f => {
      let msg = `  ${f.name}: FAILED`;
      msg += `\n    actual:   [${f.actual.join(", ")}]`;
      msg += `\n    expected: [${f.expected.join(", ")}]`;
      return msg;
    });
    throw new Error(`WESL tests failed:\n${messages.join("\n")}`);
  }
}

/**
 * Runs all @test functions in a WESL module.
 * Each test function is wrapped in a compute shader and dispatched.
 * Returns results for all tests.
 */
export async function runWesl(params: RunWeslParams): Promise<TestResult[]> {
  const { testName } = params;
  const { shaderSrc, ast } = await parseTestModule(params);
  let testFns = findTestFunctions(ast);
  if (testName) {
    testFns = testFns.filter(t => t.name === testName);
  }
  const results: TestResult[] = [];
  for (const testFn of testFns) {
    results.push(await runSingleTest({ testFn, shaderSrc, ...params }));
  }
  return results;
}

/** Load and parse a WESL module to extract @test functions. */
async function parseTestModule(params: {
  src?: string;
  moduleName?: string;
  projectDir?: string;
}): Promise<ParsedTestModule> {
  const { projectDir, src, moduleName } = params;
  const shaderSrc = await resolveShaderSource(src, moduleName, projectDir);
  const modPath = moduleName || "test";
  const ast = parseSrcModule({
    modulePath: modPath,
    debugFilePath: modPath + ".wesl",
    src: shaderSrc,
  });
  return { shaderSrc, ast };
}

/** Wrap a @test function in a compute shader, dispatch it, and return results. */
async function runSingleTest(params: RunSingleTestParams): Promise<TestResult> {
  const { testFn, shaderSrc, device, ...rest } = params;
  // Generate wrapper that calls the test function
  // Call initTestResult() function to initialize the result buffer
  const wrapper = `
import wgsl_test::TestResult::initTestResult;

${shaderSrc}

@compute @workgroup_size(1)
fn _weslTestEntry() {
  initTestResult();
  ${testFn.name}();
}
`;
  const weslTestBundle = await getWeslTestBundle();
  const module = await compileShader({
    ...rest,
    device,
    src: wrapper,
    libs: [weslTestBundle],
  });

  const resultElems = testResultSize / 4; // 48 bytes / 4 bytes per u32 = 12
  const gpuResult = await runCompute({
    device,
    module,
    resultFormat: "u32",
    size: resultElems,
    entryPoint: "_weslTestEntry",
  });
  const testLabel = testFn.description ?? testFn.name;
  return parseTestResult(testLabel, gpuResult);
}

/** Lazy-load and cache the wgsl-test shader library bundle. */
async function getWeslTestBundle(): Promise<WeslBundle> {
  if (cachedWeslBundle) return cachedWeslBundle;
  // Use import.meta.url to resolve the path correctly regardless of cwd
  const bundlePath = new URL("../dist/weslBundle.js", import.meta.url).href;
  const mod = await import(bundlePath);
  cachedWeslBundle = mod.default;
  return cachedWeslBundle;
}

/** Decode TestResult struct from GPU buffer (passed flag + actual/expected vec4f). */
function parseTestResult(name: string, gpuResult: number[]): TestResult {
  // TestResult struct layout (with vec4f 16-byte alignment):
  // [0] passed (u32)
  // [1] failCount (u32)
  // [2-3] padding (8 bytes to align vec4f)
  // [4-7] actual (vec4f)
  // [8-11] expected (vec4f)
  const passed = gpuResult[0] === 1;

  // Reinterpret u32 bits as f32 for actual/expected (always captured now)
  const u32Array = new Uint32Array(gpuResult.slice(4, 12));
  const f32Array = new Float32Array(u32Array.buffer);
  const actual = Array.from(f32Array.slice(0, 4));
  const expected = Array.from(f32Array.slice(4, 8));

  return { name, passed, actual, expected };
}
