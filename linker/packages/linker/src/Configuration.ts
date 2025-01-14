import { LinkConfig } from "./Linker.ts";
import { bindingStructTransform } from "./TransformBindingStructs.ts";

/** enable proof of concept binding structs tranform */
export function enableBindingStructs(config: LinkConfig = {}): LinkConfig {
  const transforms = config?.transforms || [];
  transforms.push(bindingStructTransform);
  return { ...config, transforms };
}
