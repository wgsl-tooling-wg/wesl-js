/*
 * a test program that imports from the wesl plugin's ?reflect endpoint
 * and logs the layout entries to the console for verification by a test runner
 */

const { create, globals } = require("webgpu"); // include webgpu just for the GPUShaderStage enumb

Object.assign(globalThis, globals);

run();

async function run() {
  // import from our reflection endpoint dynamically, so that globalThis is set first
  // (a static import statement might be hoisted above Object.assign)
  const reflected = await import("./shaders/layoutTest.wesl?reflect");

  console.log(JSON.stringify(reflected.layoutEntries, null, 2));
}
