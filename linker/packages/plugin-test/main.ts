/// <reference types="wesl-plugin" />
import { layoutFunctions } from "./shaders/app.wesl?reflect";

main();
async function main() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.error("no GPU device available");
  }
  const layout = layoutFunctions.myBindingsLayout(device);
  console.log(layout);
}
