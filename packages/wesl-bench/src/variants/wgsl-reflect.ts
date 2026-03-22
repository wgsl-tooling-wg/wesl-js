import { srcToText } from "../BenchUtils.ts";
import type { WeslSource } from "../LoadExamples.ts";

let WgslReflect: any;

export async function setup(source: WeslSource): Promise<{ text: string }> {
  if (!WgslReflect) {
    const mod = await import("wgsl_reflect");
    WgslReflect = mod.WgslReflect;
  }
  return { text: srcToText(source.weslSrc) };
}

export function run(state: { text: string }): void {
  new WgslReflect(state.text);
}
