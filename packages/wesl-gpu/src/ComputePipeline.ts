import { CompositeResolver, link, RecordResolver } from "wesl";
import type { AnnotatedLayout } from "wesl-reflect";
import { withErrorScopes } from "./ErrorScopes.ts";
import type { WeslOptions } from "./FragmentParams.ts";
import { scanUniforms } from "./UniformsVirtualLib.ts";

export type LinkComputeParams = WeslOptions & {
  device: GPUDevice;
  /** WESL/WGSL compute shader source. */
  computeSource: string;
};

export interface LinkComputeResult {
  module: GPUShaderModule;
  layout: AnnotatedLayout | null;
}

/** Link a WESL/WGSL compute shader into a GPU shader module.
 *  Mirrors `linkFragmentShader` minus the synthetic vertex prelude. */
export async function linkComputeShader(
  params: LinkComputeParams,
): Promise<LinkComputeResult> {
  const { computeSource, conditions, constants, packageName, config } = params;
  const { device, resolver, libs = [], rootModuleName = "main" } = params;
  const { weslSrc, virtualLibs } = params;

  const resolvers: RecordResolver[] = [
    new RecordResolver({ [rootModuleName]: computeSource }, { packageName }),
  ];
  if (weslSrc) resolvers.push(new RecordResolver(weslSrc, { packageName }));

  let finalResolver =
    resolvers.length === 1 ? resolvers[0] : new CompositeResolver(resolvers);
  if (resolver)
    finalResolver = new CompositeResolver([finalResolver, resolver]);

  const pkg = packageName ?? "package";
  const scan = scanUniforms(computeSource, `${pkg}::${rootModuleName}`);
  const mergedVirtualLibs = { ...scan.virtualLibs, ...virtualLibs };

  const linked = await link({
    resolver: finalResolver,
    rootModuleName,
    packageName,
    libs,
    virtualLibs: mergedVirtualLibs,
    conditions,
    constants,
    config,
  });

  return { module: linked.createShaderModule(device), layout: scan.layout };
}

export interface RunComputeParams {
  device: GPUDevice;
  module: GPUShaderModule;
  entryPoint: string;
  bindGroup: GPUBindGroup;
  pipelineLayout: GPUPipelineLayout;
  /** `@buffer` storage buffers to read back, keyed by var name. */
  readBuffers: Map<string, GPUBuffer>;
}

export interface ComputeRunResult {
  /** ArrayBuffer copied from each `@buffer` storage buffer, keyed by var name. */
  readbacks: Map<string, ArrayBuffer>;
}

/** Dispatch a compute shader once (1,1,1) and read back named storage buffers. */
export async function runCompute(
  p: RunComputeParams,
): Promise<ComputeRunResult> {
  return withErrorScopes(p.device, () => dispatchAndReadback(p));
}

/** Build the pipeline, dispatch once (1,1,1), copy each readBuffer to a
 *  MAP_READ staging buffer, and return the mapped contents. */
async function dispatchAndReadback(
  p: RunComputeParams,
): Promise<ComputeRunResult> {
  const { device, module, entryPoint, bindGroup, pipelineLayout } = p;
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module, entryPoint },
  });

  const stagingBuffers = new Map<string, GPUBuffer>();
  for (const [name, src] of p.readBuffers) {
    stagingBuffers.set(name, createStagingBuffer(device, src.size, name));
  }

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1, 1, 1);
  pass.end();
  for (const [name, src] of p.readBuffers) {
    const dst = stagingBuffers.get(name)!;
    encoder.copyBufferToBuffer(src, 0, dst, 0, src.size);
  }
  device.queue.submit([encoder.finish()]);

  const readbacks = new Map<string, ArrayBuffer>();
  for (const [name, staging] of stagingBuffers) {
    await staging.mapAsync(GPUMapMode.READ);
    readbacks.set(name, staging.getMappedRange().slice(0));
    staging.unmap();
    staging.destroy();
  }
  return { readbacks };
}

/** Allocate a MAP_READ + COPY_DST buffer for compute readback. */
function createStagingBuffer(
  device: GPUDevice,
  size: number,
  name: string,
): GPUBuffer {
  return device.createBuffer({
    label: `compute-readback-${name}`,
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
}

/** Clear each buffer to zeros so re-runs / re-tests see deterministic initial state. */
export function clearBuffers(
  device: GPUDevice,
  buffers: Iterable<GPUBuffer>,
): void {
  const encoder = device.createCommandEncoder({ label: "clearBuffers" });
  let any = false;
  for (const buffer of buffers) {
    encoder.clearBuffer(buffer);
    any = true;
  }
  if (any) device.queue.submit([encoder.finish()]);
}
