/** @hidden */
declare module "*?reflect" {
  export const layoutEntries: Record<string, GPUBindGroupLayoutEntry[]>;
  export const layoutFunctions: Record<
    string,
    (device: GPUDevice) => GPUBindGroupLayout
  >;
}

/** @hidden */
declare module "*?link" {
  export default LinkConfig;
}
