/** @hidden */
declare module "*?link" {
  const linkParams: LinkParams;
  export default linkParams;
}

declare module "*?static" {
  const wgsl: string;
  export default wgsl;
}

/** @hidden */ // LATER move to separate package
declare module "*?bindingLayout" {
  export const layoutEntries: Record<string, GPUBindGroupLayoutEntry[]>;
  export const layoutFunctions: Record<
    string,
    (device: GPUDevice) => GPUBindGroupLayout
  >;
}