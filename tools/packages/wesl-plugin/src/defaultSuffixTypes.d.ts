/** @hidden */
declare module "*?link" {
  const linkConfig: LinkConfig;
  export default linkConfig;
}

/** @hidden */ // TODO move to separate package
declare module "*?bindingLayout" {
  export const layoutEntries: Record<string, GPUBindGroupLayoutEntry[]>;
  export const layoutFunctions: Record<
    string,
    (device: GPUDevice) => GPUBindGroupLayout
  >;
}