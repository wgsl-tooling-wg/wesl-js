/** @hidden */
declare module "*?link" {
  import type { LinkParams } from "wesl";
  const linkParams: LinkParams;
  export default linkParams;
}

declare module "*?static" {
  const wgsl: string;
  export default wgsl;
}

/** @hidden */
declare module "*?simple_reflect" {
  import type { WeslStruct } from "wesl-reflect";
  export const structs: WeslStruct[];
}

/** @hidden */ // LATER move to separate package
declare module "*?bindingLayout" {
  export const layouts: Record<string, GPUBindGroupLayoutEntry[]>;
  export const layoutFunctions: Record<
    string,
    (device: GPUDevice) => GPUBindGroupLayout
  >;
}
