import type { VirtualLibraryFn } from "wesl";

/** User provided uniform values */
export interface RenderUniforms {
  /** Elapsed time in seconds (default: 0.0) */
  time?: number;

  /** Mouse position in [0,1] normalized coords (default: [0.0, 0.0]) */
  mouse?: [number, number];

  // Note: resolution is auto-populated from size parameter
  // resolution?: [number, number];
}

/**
 * Creates a standard uniform buffer for running test shaders.
 *
 * @param outputSize - Output texture dimensions (becomes uniforms.resolution)
 * @param uniforms - User-provided uniform values (time, mouse)
 * @returns GPUBuffer containing uniform data
 */
export function renderUniformBuffer(
  device: GPUDevice,
  outputSize: [number, number],
  uniforms: RenderUniforms = {},
): GPUBuffer {
  const resolution = outputSize;
  const time = uniforms.time ?? 0.0;
  const mouse = uniforms.mouse ?? [0.0, 0.0];

  // WGSL struct layout with alignment:
  // struct Uniforms {
  //   resolution: vec2f,  // offset 0, size 8
  //   time: f32,          // offset 8, size 4
  //   // implicit padding    offset 12, size 4 (for vec2f alignment)
  //   mouse: vec2f,       // offset 16, size 8
  //   // struct padding      offset 24, size 8 (uniform buffer requires 16-byte struct alignment)
  // }
  // Total: 32 bytes
  const buffer = device.createBuffer({
    label: "standard-uniforms",
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const data = new Float32Array([
    resolution[0],
    resolution[1],
    time,
    0.0, // implicit padding for vec2f alignment
    mouse[0],
    mouse[1],
    0.0, // struct padding to 32 bytes
    0.0, // struct padding to 32 bytes
  ]);

  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

/**
 * return the WGSL struct for use in shaders as test::Uniforms.
 *
 * @returns virtual library object for passing to compileShader()
 */
export function createUniformsVirtualLib(): Record<string, VirtualLibraryFn> {
  return {
    test: () => `
      struct Uniforms {
        resolution: vec2f,  // Output viewport dimensions
        time: f32,          // Elapsed time in seconds
        mouse: vec2f,       // Mouse position [0,1] normalized coords
      }
    `,
  };
}
