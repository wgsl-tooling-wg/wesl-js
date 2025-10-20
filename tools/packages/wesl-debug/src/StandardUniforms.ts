import type { VirtualLibraryFn } from "wesl";

/** Standard uniform values for fragment shader testing */
export interface StandardUniforms {
  /** Elapsed time in seconds (default: 0.0) */
  time?: number;

  /** Mouse position in [0,1] normalized coords (default: [0.0, 0.0]) */
  mouse?: [number, number];

  // Note: resolution is auto-populated from size parameter, not specified here
}

/**
 * Creates a uniform buffer with standard shader parameters.
 *
 * @param device - GPU device
 * @param outputSize - Output texture dimensions (becomes uniforms.resolution)
 * @param uniforms - User-provided uniform values (time, mouse)
 * @returns GPUBuffer containing uniform data
 *
 * @example
 * ```typescript
 * const uniformBuffer = createUniformBuffer(device, [512, 512], {
 *   time: 5.0,
 *   mouse: [0.5, 0.5]
 * });
 * ```
 */
export function createUniformBuffer(
  device: GPUDevice,
  outputSize: [number, number],
  uniforms: StandardUniforms = {},
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
 * Creates a virtual library function that provides the test::Uniforms struct.
 *
 * @returns Virtual library object for passing to compileShader()
 *
 * @example
 * ```typescript
 * const virtualLibs = createUniformsVirtualLib();
 * const module = await compileShader({ src, virtualLibs, ... });
 * ```
 *
 * Shaders can then use:
 * ```wgsl
 * @group(0) @binding(0) var<uniform> u: test::Uniforms;
 *
 * @fragment
 * fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
 *   let st = pos.xy / u.resolution;
 *   return vec4f(st, 0.0, 1.0);
 * }
 * ```
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
