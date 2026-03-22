/// <reference types="wesl-plugin/suffixes" />
import linked from "./shaders/app.wesl?link";

/**
 * a test program that imports from the wesl plugin's ?link endpoint
 * and logs the layout entries to the console for verification by a test runner
 */

run();

async function run() {
  console.log(JSON.stringify(linked, null, 2));
}
