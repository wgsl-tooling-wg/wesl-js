/** @hidden */
declare module "*?link" {
  const linkParams: LinkParams;
  export default linkParams;
}

/** @hidden */ // TODO move to separate package
declare module "*?bindingLayout" {
  export const layoutEntries: Record<string, GPUBindGroupLayoutEntry[]>;
  export const layoutFunctions: Record<
    string,
    (device: GPUDevice) => GPUBindGroupLayout
  >;
}