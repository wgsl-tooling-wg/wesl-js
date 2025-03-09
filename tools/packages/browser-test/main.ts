/// <reference types="vite/client" />
import { copyBuffer } from "thimbleberry";
import { link, LinkParams, makeWeslDevice } from "wesl";
// Convince vite to also watch these files
import mainWesl from "./src/shaders/main.wesl?raw";
import uniformsWesl from "./src/shaders/uniforms.wesl?raw";

main();

const app = document.getElementById("app")!;

async function main() {
  const params: LinkParams = {
    weslSrc: {
      "main.wesl": mainWesl,
      "uniforms.wesl": uniformsWesl,
    },
  };
  const linkerOutput = await link(params);

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice()?.then(makeWeslDevice);
  if (!device) {
    console.error("no GPU device available");
    return;
  }

  const module = linkerOutput.createShaderModule(device, {});

  const bgLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });

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
      { binding: 1, resource: { buffer: uniformsBuffer } },
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
  app.innerText = "Shader result is: " + data.join(", ");
}
