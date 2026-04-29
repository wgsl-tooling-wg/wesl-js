import { type LinkParams, parseSrcModule, type WeslAST } from "wesl";
import { runCompute } from "wesl-gpu";
import {
  annotatedResourcesPlugin,
  type DiscoveredBuffer,
  type DiscoveredResource,
  findAnnotatedResources,
  type ScalarKind,
  type TypeShape,
  varReflection,
} from "wesl-reflect";
import { compileShader } from "./CompileShader.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";
import { createTestResources } from "./TestResourceSetup.ts";

export interface ComputeTestParams {
  /** WESL/WGSL source code for the compute shader to test.
   * Either src or moduleName must be provided, but not both. */
  src?: string;

  /** Name of shader module to load from filesystem.
   * Supports: bare name (sum.wgsl), path (algorithms/sum.wgsl), or module path (package::algorithms::sum).
   * Either src or moduleName must be provided, but not both. */
  moduleName?: string;

  /** Project directory for resolving shader dependencies.
   * Allows the shader to import from npm shader libraries.
   * Optional: defaults to searching upward from cwd for package.json or wesl.toml.
   * Typically use `import.meta.url`. */
  projectDir?: string;

  /** GPU device for running the tests. */
  device: GPUDevice;

  /** Flags for conditional compilation to test shader specialization. */
  conditions?: LinkParams["conditions"];

  /** Constants for shader compilation, injected via the `constants::` namespace. */
  constants?: LinkParams["constants"];

  /** Use source shaders from current package instead of built bundles.
   * Default: true for faster iteration during development. */
  useSourceShaders?: boolean;

  /** Number of workgroups to dispatch. Default: 1
   * Can be a single number or [x, y, z] for multi-dimensional dispatch. */
  dispatchWorkgroups?: number | [number, number, number];
}

/** Sentinel pre-fill for storage buffers; unwritten slots remain visible. */
const sentinel = -999.0;

/**
 * Compile and run a compute shader on the GPU for testing.
 *
 * Each `@buffer` declared in the shader becomes a bound storage buffer; values
 * written to read_write buffers are returned in the result, keyed by var name.
 * Unwritten slots show as -999 (f32 sentinel pre-fill).
 *
 * Shader libraries mentioned in the source are auto-resolved from node_modules.
 *
 * Example:
 * ```ts
 * const { results } = await testCompute({ device, src: `
 *   @buffer var<storage, read_write> results: array<u32, 2>;
 *   @compute @workgroup_size(1) fn main() { results[0] = 42u; results[1] = 7u; }
 * `});
 * ```
 *
 * @returns Record keyed by `@buffer` var name; values are decoded as the
 *   buffer's leaf scalar type (f32/i32/u32).
 */
export async function testCompute(
  params: ComputeTestParams,
): Promise<Record<string, number[]>> {
  const { device, src, moduleName, projectDir } = params;
  const { conditions, constants, useSourceShaders } = params;
  const dispatchWorkgroups = params.dispatchWorkgroups ?? 1;

  const shaderSrc = await resolveShaderSource(src, moduleName, projectDir);
  const { ast, resources, bufferVars } = parseAndValidate(shaderSrc);

  const startBinding = 0;
  const module = await compileShader({
    projectDir,
    device,
    src: shaderSrc,
    conditions,
    constants,
    useSourceShaders,
    plugins: [annotatedResourcesPlugin(resources, startBinding)],
  });

  const { bindGroup, pipelineLayout, buffers } = await setupBindings(
    device,
    resources,
    startBinding,
  );

  const readBuffers = mapReadWriteBuffers(bufferVars, buffers);
  const { readbacks } = await runCompute({
    device,
    module,
    entryPoint: "main",
    bindGroup,
    pipelineLayout,
    readBuffers,
    dispatchWorkgroups,
  });

  return decodeReadbacks(ast, readbacks);
}

/** Parse the shader and extract @buffer vars; throws if none are declared. */
function parseAndValidate(shaderSrc: string): {
  ast: WeslAST;
  resources: DiscoveredResource[];
  bufferVars: DiscoveredBuffer[];
} {
  const ast = parseSrcModule({
    modulePath: "main",
    debugFilePath: "./main.wesl",
    src: shaderSrc,
  });
  const resources = findAnnotatedResources(ast);
  const bufferVars = resources.filter(
    (r): r is DiscoveredBuffer => r.kind === "buffer",
  );
  if (bufferVars.length === 0) {
    throw new Error(
      "testCompute: shader has no @buffer declarations. Add e.g. " +
        "`@buffer var<storage, read_write> results: array<u32, 4>;` to capture results.",
    );
  }
  return { ast, resources, bufferVars };
}

/** Allocate test buffers and build the bind group + pipeline layout. */
async function setupBindings(
  device: GPUDevice,
  resources: DiscoveredResource[],
  startBinding: number,
): Promise<{
  bindGroup: GPUBindGroup;
  pipelineLayout: GPUPipelineLayout;
  buffers: GPUBuffer[];
}> {
  const test = await createTestResources(device, resources, startBinding, {
    prefill: sentinel,
  });
  const bgLayout = device.createBindGroupLayout({
    entries: test.layoutEntries,
  });
  const bindGroup = device.createBindGroup({
    layout: bgLayout,
    entries: test.entries,
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bgLayout],
  });
  return { bindGroup, pipelineLayout, buffers: test.buffers };
}

/** Decode each readback buffer using the var's reflected type. */
function decodeReadbacks(
  ast: WeslAST,
  readbacks: Map<string, ArrayBuffer>,
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const [name, data] of readbacks) {
    result[name] = decodeBuffer(data, varReflection(ast, name).type);
  }
  return result;
}

/** Map read_write @buffer var name to its GPU buffer (matched by declaration order). */
function mapReadWriteBuffers(
  bufferVars: DiscoveredBuffer[],
  rwBuffers: GPUBuffer[],
): Map<string, GPUBuffer> {
  const rw = bufferVars.filter(b => b.access === "read_write");
  return new Map(rw.map((b, i) => [b.varName, rwBuffers[i]]));
}

/** Decode an ArrayBuffer as a flat number[] using the type's leaf scalar kind. */
function decodeBuffer(data: ArrayBuffer, type: TypeShape): number[] {
  const kind = leafScalar(type);
  switch (kind) {
    case "f32":
      return Array.from(new Float32Array(data));
    case "i32":
      return Array.from(new Int32Array(data));
    case "u32":
      return Array.from(new Uint32Array(data));
    default:
      throw new Error(`testCompute: cannot decode buffer of kind '${kind}'`);
  }
}

/** Walk into arrays/vecs/mats/atomics to find the underlying scalar element kind. */
function leafScalar(t: TypeShape): ScalarKind {
  if (t.kind === "scalar") return t.type;
  if (t.kind === "vec") return t.component;
  if (t.kind === "mat") return t.component;
  if (t.kind === "atomic") return t.component;
  if (t.kind === "array") return leafScalar(t.elem);
  throw new Error(`testCompute: cannot decode buffer of kind '${t.kind}'`);
}
