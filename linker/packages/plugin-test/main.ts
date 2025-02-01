/// <reference types="wesl-plugin" />
/// <reference types="vite/client" />
import { bindingStructsPlugin, link, link2, LinkConfig, noSuffix } from "wesl";
import { layoutEntries, layoutFunctions } from "./shaders/app.wesl?reflect";
import { dlog } from "berry-pretty";
import { copyBuffer } from "thimbleberry";

const weslRoot = "./shaders";
const weslSrc = import.meta.glob("./shaders/*.wesl", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

main();

async function main() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.error("no GPU device available");
    return;
  }
  const bgLayout = layoutFunctions.myBindingsLayout(device);

  const config: LinkConfig = {
    plugins: [bindingStructsPlugin()],
  };
  const code = link2({ weslSrc, weslRoot, rootModuleName: "app", config }).dest;

  const module = device.createShaderModule({ code });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bgLayout],
  });

  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module,
    },
  });

  const storageBuffer = device.createBuffer({
    label: "storage",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const uniformsBuffer = device.createBuffer({
    label: "uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: bgLayout,
    entries: [
      { binding: 0, resource: { buffer: storageBuffer } },
      { binding: 1, resource: { buffer: uniformsBuffer} },
    ],
  });

  device.queue.writeBuffer(uniformsBuffer, 0, new Uint32Array([4, 2, 3, 1]));

  const commands = device.createCommandEncoder();
  const pass = commands.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1, 1, 1);
  pass.end();
  device.queue.submit([commands.finish()]);
  
  const data = await copyBuffer(device, storageBuffer);
  console.log(data);
}