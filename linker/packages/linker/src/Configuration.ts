import { LinkConfig } from "./Linker.ts";
import { BindingStructReportFn, reportBindingStructs } from "./Reflection.ts";
import { lowerBindingStructs } from "./TransformBindingStructs.ts";

/** enable proof of concept binding structs tranform */
export function enableBindingStructs(config: LinkConfig = {}): LinkConfig {
  const transforms = config?.transforms || [];
  transforms.push(lowerBindingStructs);
  return { ...config, transforms };
}

/** enable binding struct reflection, with a pluggable report fn  */
export function bindingStructReflect(
  config: LinkConfig = {},
  fn: BindingStructReportFn,
): LinkConfig {
  const transforms = config?.transforms || [];
  transforms.push(reportBindingStructs(fn));
  return { ...config, transforms };
}
