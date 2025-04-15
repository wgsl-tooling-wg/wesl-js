/// <reference types="wesl-plugin/suffixes" />
import { link } from "wesl";
import appWesl from "../shaders/app.wesl?link";

main();

async function main(): Promise<void> {
  const wgslSrcMap = await link(appWesl);
  const wgslSrc = wgslSrcMap.dest;

  displayShaderCode(wgslSrc);

  launchShader(wgslSrc);
}

function displayShaderCode(wgslSrc: string): void {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `<pre>${
    wgslSrc + "\n<foo>"
  }<pre>`;
}

async function launchShader(wgsl: string): Promise<void> {
  const adapter = await navigator.gpu.requestAdapter();
  const device = (await adapter?.requestDevice())!;

  const module = device?.createShaderModule({ code: wgsl });
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module },
  });

  const commands = device.createCommandEncoder();
  const pass = commands.beginComputePass();
  pass.setPipeline(pipeline);
  pass.dispatchWorkgroups(1, 1, 1);
  pass.end();
  device.queue.submit([commands.finish()]);
}
