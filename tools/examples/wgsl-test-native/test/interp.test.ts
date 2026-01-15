import { getGPUDevice, testWesl } from "wgsl-test";

const projectDir = new URL("..", import.meta.url).href;
const device = await getGPUDevice();

await testWesl({ device, moduleName: "interp_test", projectDir });
