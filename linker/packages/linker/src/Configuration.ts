import { LinkConfig } from "./Linker.ts";
import { lowerBindingStructs } from "./TransformBindingStructs.ts";

/** enable proof of concept binding structs tranform */
export function enableBindingStructs(config: LinkConfig = {}): LinkConfig {
  const transforms = config?.transforms || [];
  transforms.push(lowerBindingStructs);
  return { ...config, transforms };
}
