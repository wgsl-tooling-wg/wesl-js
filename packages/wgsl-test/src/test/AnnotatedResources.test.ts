import { testWesl } from "../TestWesl.ts";
import { getGPUDevice } from "../WebGPUTestSetup.ts";
import { loadFixture } from "./TestSupport.ts";

const device = await getGPUDevice();

await testWesl({ device, src: loadFixture("buffer_read_write.wesl") });
await testWesl({ device, src: loadFixture("texture_sampling.wesl") });
await testWesl({ device, src: loadFixture("multiple_resources.wesl") });
