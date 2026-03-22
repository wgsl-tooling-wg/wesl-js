/// <reference types="wesl-plugin/suffixes" />
import { link } from "wesl";
import linkParams from "./shaders/app.wesl?link";

/**
 * a test program that imports from the wesl plugin's ?link endpoint
 * and logs linked result to the console for verification by a test runner
 */

run();

async function run() {
  const linked = await link(linkParams);
  console.log(linked.dest);
}
