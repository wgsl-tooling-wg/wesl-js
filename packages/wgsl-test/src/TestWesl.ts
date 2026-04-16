import { type LinkParams, parseSrcModule } from "wesl";
import {
  annotatedResourcesPlugin,
  type DiscoveredResource,
  findAnnotatedResources,
} from "wesl-reflect";
import weslBundle from "../lib/weslBundle.js";
import {
  compileShader,
  resolveShaderContext,
  type ShaderContext,
} from "./CompileShader.ts";
import {
  createTestResources,
  reZeroBuffers,
  type TestResources,
} from "./ResourceCreation.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";
import { type ComputeTestParams, runCompute } from "./TestComputeShader.ts";
import {
  findSnapshotFunctions,
  findTestFunctions,
  type SnapshotFunctionInfo,
  type TestFunctionInfo,
  testDisplayName,
} from "./TestDiscovery.ts";
import {
  renderSnapshotImage,
  runSnapshotTest,
  type SnapshotResult,
  type SnapshotTestParams,
} from "./TestSnapshotShader.ts";
import { importImageSnapshot, importVitest } from "./VitestImport.ts";

/** Size of TestResult struct in bytes (u32 + u32 + padding + vec4f + vec4f = 48). */
const testResultSize = 48;

/** Parameters for running @test functions in a WESL module. */
export type RunWeslParams = Omit<
  ComputeTestParams,
  "resultFormat" | "size" | "dispatchWorkgroups"
> & {
  /** Run only the @test function with this name */
  testName?: string;
  /** Path to test file (for snapshot directory resolution) */
  testFilePath?: string;
  /** Snapshot update mode: "all", "new", or "none" */
  updateSnapshot?: string;
};

/** Result from running a single @test function on the GPU. */
export interface TestResult {
  name: string;
  passed: boolean;
  actual: number[];
  expected: number[];
  snapshot?: SnapshotResult;
}

/** Parameters for testWesl() which registers all @test functions with vitest. */
export type TestWeslParams = Omit<RunWeslParams, "testName">;

/** Shared params for all tests in a file. */
interface TestFileParams {
  shaderSrc: string;
  shaderContext: ShaderContext;
  device: GPUDevice;
  conditions?: LinkParams["conditions"];
  constants?: LinkParams["constants"];
  resources: DiscoveredResource[];
  testResources?: TestResources;
}

/** Parsed WESL source with its AST for test discovery. */
interface ParsedTestModule {
  shaderSrc: string;
  ast: ReturnType<typeof parseSrcModule>;
}

/**
 * Discovers @test and @snapshot functions in a WESL module and registers each
 * as a vitest test. Use top-level await in your test file to call this function.
 */
export async function testWesl(params: TestWeslParams): Promise<void> {
  const { test } = await importVitest();
  const { shaderSrc, ast } = await parseTestModule(params);
  const testFns = findTestFunctions(ast);
  const snapshotFns = findSnapshotFunctions(ast);

  // Register compute @test functions
  for (const fn of testFns) {
    test(testDisplayName(fn.name, fn.description), async () => {
      await expectWesl({ ...params, testName: fn.name });
    });
  }

  // Register @fragment @snapshot tests
  if (snapshotFns.length > 0) {
    const resources = findAnnotatedResources(ast);
    const snapshotArgs = {
      runParams: params,
      shaderSrc,
      resources,
      testFns,
      snapshotFns,
    };
    const snapshotParams = await buildSnapshotParams(snapshotArgs);
    const { imageMatcher } = await importImageSnapshot();
    const { expect: vitestExpect } = await importVitest();
    imageMatcher();
    for (const snap of snapshotFns) {
      test(testDisplayName(snap.name, snap.snapshotName), async () => {
        const imageData = await renderSnapshotImage(snap, snapshotParams);
        await vitestExpect(imageData).toMatchImage(snap.snapshotName);
      });
    }
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
      if (f.snapshot) {
        return `  ${f.name}: FAILED\n    ${f.snapshot.message}`;
      }
      return [
        `  ${f.name}: FAILED`,
        `    actual:   [${f.actual.join(", ")}]`,
        `    expected: [${f.expected.join(", ")}]`,
      ].join("\n");
    });
    throw new Error(`WESL tests failed:\n${messages.join("\n")}`);
  }
}

/**
 * Runs all @test and @snapshot functions in a WESL module.
 * Compute tests are wrapped and dispatched. Fragment tests are rendered and compared.
 * Returns unified results for all tests.
 */
export async function runWesl(runParams: RunWeslParams): Promise<TestResult[]> {
  const { testName, device, conditions, constants } = runParams;
  const { shaderSrc, ast } = await parseTestModule(runParams);

  let testFns = findTestFunctions(ast);
  let snapshotFns = findSnapshotFunctions(ast);
  if (testName) {
    testFns = testFns.filter(t => t.name === testName);
    snapshotFns = snapshotFns.filter(s => s.name === testName);
  }

  const resources = findAnnotatedResources(ast);
  const shaderContext = await resolveShaderContext({
    src: shaderSrc,
    projectDir: runParams.projectDir,
    useSourceShaders: runParams.useSourceShaders,
    virtualLibNames: [],
  });

  // Compute test resources (binding 0 = testResult, resources at 1+)
  const computeResources =
    resources.length > 0 && testFns.length > 0
      ? await createTestResources(device, resources)
      : undefined;

  const computeParams: TestFileParams = {
    shaderSrc,
    shaderContext,
    device,
    conditions,
    constants,
    resources,
    testResources: computeResources,
  };

  const results: TestResult[] = [];

  // Run compute tests sequentially; rezero read_write buffers between tests.
  // WebGPU zero-inits buffers on creation, so the first test doesn't need it.
  for (let i = 0; i < testFns.length; i++) {
    if (i > 0 && computeResources)
      reZeroBuffers(device, computeResources.buffers);
    results.push(await runSingleComputeTest(testFns[i], computeParams));
  }

  // Run fragment snapshot tests
  if (snapshotFns.length > 0) {
    const snapArgs = {
      runParams,
      shaderSrc,
      resources,
      shaderContext,
      testFns,
      snapshotFns,
    };
    const snapshotParams = await buildSnapshotParams(snapArgs);
    const { expect } = await importVitest();
    const testFilePath =
      runParams.testFilePath ?? expect.getState().testPath ?? process.cwd();
    for (const snap of snapshotFns) {
      const snapResult = await runSnapshotTest(
        snap,
        snapshotParams,
        testFilePath,
        runParams.updateSnapshot,
      );
      results.push({
        name: snap.name,
        passed: snapResult.passed,
        actual: [],
        expected: [],
        snapshot: snapResult,
      });
    }
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

/** Build shared params for snapshot tests. */
type SnapshotRunParams = Pick<
  RunWeslParams,
  "device" | "projectDir" | "useSourceShaders" | "conditions" | "constants"
>;

interface BuildSnapshotArgs {
  runParams: SnapshotRunParams;
  shaderSrc: string;
  resources: DiscoveredResource[];
  shaderContext?: ShaderContext;
  testFns: TestFunctionInfo[];
  snapshotFns: SnapshotFunctionInfo[];
}

/** Build snapshot test params, resolving shader context if not already available. */
async function buildSnapshotParams(
  args: BuildSnapshotArgs,
): Promise<SnapshotTestParams> {
  const { runParams, shaderSrc, resources, testFns, snapshotFns } = args;
  const resolvedContext =
    args.shaderContext ??
    (await resolveShaderContext({
      src: shaderSrc,
      projectDir: runParams.projectDir,
      useSourceShaders: runParams.useSourceShaders,
      virtualLibNames: [],
    }));
  const fragmentResources =
    resources.length > 0
      ? await createTestResources(runParams.device, resources, 1)
      : undefined;

  return {
    device: runParams.device,
    shaderSrc,
    shaderContext: resolvedContext,
    resources,
    fragmentResources,
    allSnapshotFns: snapshotFns,
    testFns,
    conditions: runParams.conditions,
    constants: runParams.constants,
  };
}

/** Wrap a @test function in a compute shader, dispatch it, and return results. */
async function runSingleComputeTest(
  testFn: TestFunctionInfo,
  params: TestFileParams,
): Promise<TestResult> {
  const { shaderSrc, shaderContext, device, conditions, constants } = params;
  const { resources, testResources } = params;

  const wrapper = `
import wgsl_test::TestResult::initTestResult;

${shaderSrc}

@compute @workgroup_size(1)
fn _weslTestEntry() {
  initTestResult();
  ${testFn.name}();
}
`;

  const plugins =
    resources.length > 0 ? [annotatedResourcesPlugin(resources, 1)] : undefined;

  const module = await compileShader({
    device,
    src: wrapper,
    libs: [weslBundle],
    shaderContext,
    conditions,
    constants,
    plugins,
  });

  const resultElems = testResultSize / 4; // 48 bytes / 4 bytes per u32 = 12
  const gpuResult = await runCompute({
    device,
    module,
    resultFormat: "u32",
    size: resultElems,
    entryPoint: "_weslTestEntry",
    extraEntries: testResources?.entries,
    extraLayoutEntries: testResources?.layoutEntries,
  });
  return parseTestResult(testFn.name, gpuResult);
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

  // reinterpret u32 bits as f32 for actual/expected vec4f values
  const u32Array = new Uint32Array(gpuResult.slice(4, 12));
  const f32Array = new Float32Array(u32Array.buffer);
  const actual = Array.from(f32Array.slice(0, 4));
  const expected = Array.from(f32Array.slice(4, 8));

  return { name, passed, actual, expected };
}
