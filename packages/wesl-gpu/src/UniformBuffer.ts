import type { AnnotatedLayout, AutoField, UniformControl } from "wesl-reflect";

/** Runtime values for @auto fields, keyed by autoName. */
export interface AutoValues {
  /** Canvas dimensions in pixels, scaled by devicePixelRatio. WGSL: vec2f */
  resolution?: [number, number];

  /** Elapsed time in seconds since playback started. WGSL: f32 */
  time?: number;

  /** Seconds since the previous frame. WGSL: f32 */
  delta_time?: number;

  /** Monotonically increasing frame index. WGSL: u32 */
  frame?: number;

  /** Pointer position in canvas pixels (top-left origin). WGSL: vec2f */
  mouse_pos?: [number, number];

  /** Pointer movement since last frame in pixels; reset to 0 each frame. WGSL: vec2f */
  mouse_delta?: [number, number];

  /** Pointer button state: 0=none, 1=left, 2=middle, 3=right. WGSL: i32 */
  mouse_button?: number;
}

/** Manages a GPU uniform buffer driven by AnnotatedLayout. */
export interface UniformBufferState {
  buffer: GPUBuffer;
  layout: AnnotatedLayout;
  /** Current control values (set by UI). */
  controlValues: Map<string, number | number[]>;
}

/** Default layout for shaders without @uniforms: { resolution: vec2f, time: f32 }. */
const defaultBufferSize = 16; // vec2f(8) + f32(4) + padding(4) = 16 with uniform alignment

/** Create a GPU uniform buffer sized for the given layout (or default). */
export function createUniformBuffer(
  device: GPUDevice,
  layout: AnnotatedLayout | null,
): UniformBufferState {
  const bufferSize = layout?.layout.bufferSize ?? defaultBufferSize;
  // Uniform buffers must be at least 16 bytes and aligned to 16
  const alignedSize = Math.max(16, Math.ceil(bufferSize / 16) * 16);
  const buffer = device.createBuffer({
    label: "uniforms",
    size: alignedSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const controls = layout?.controls ?? [];
  const controlValues = new Map(
    controls.map(c => [c.name, controlInitial(c)] as const),
  );

  return {
    buffer,
    layout: layout ?? defaultAnnotatedLayout(),
    controlValues,
  };
}

/** Write @auto values and control values into the buffer. */
export function writeUniforms(
  device: GPUDevice,
  state: UniformBufferState,
  auto: AutoValues,
): void {
  const { buffer, layout, controlValues } = state;
  const data = new ArrayBuffer(buffer.size);
  const f32 = new Float32Array(data);
  const i32 = new Int32Array(data);
  const u32 = new Uint32Array(data);

  // Write @auto and plain fields
  for (const field of layout.fields) {
    if (field.kind === "auto") writeAutoField(f32, i32, u32, field, auto);
    else {
      const value = controlValues.get(field.name);
      if (value !== undefined)
        writeField(f32, i32, u32, field.offset, field.type, value);
    }
  }

  // Write control values
  for (const control of layout.controls) {
    const value = controlValues.get(control.name) ?? controlInitial(control);
    writeField(f32, i32, u32, control.offset, control.type, value);
  }

  device.queue.writeBuffer(buffer, 0, data);
}

/** Write a single @auto field from runtime values. */
function writeAutoField(
  f32: Float32Array,
  i32: Int32Array,
  u32: Uint32Array,
  field: AutoField,
  auto: AutoValues,
): void {
  const { offset, autoName } = field;
  const idx = offset / 4;

  switch (autoName) {
    case "resolution": {
      const v = auto.resolution ?? [1, 1];
      f32[idx] = v[0];
      f32[idx + 1] = v[1];
      break;
    }
    case "time":
      f32[idx] = auto.time ?? 0;
      break;
    case "delta_time":
      f32[idx] = auto.delta_time ?? 0;
      break;
    case "frame":
      u32[idx] = auto.frame ?? 0;
      break;
    case "mouse_pos": {
      const v = auto.mouse_pos ?? [0, 0];
      f32[idx] = v[0];
      f32[idx + 1] = v[1];
      break;
    }
    case "mouse_delta": {
      const v = auto.mouse_delta ?? [0, 0];
      f32[idx] = v[0];
      f32[idx + 1] = v[1];
      break;
    }
    case "mouse_button":
      i32[idx] = auto.mouse_button ?? 0;
      break;
  }
}

/** Write a value at a byte offset based on WGSL type. */
function writeField(
  f32: Float32Array,
  i32: Int32Array,
  u32: Uint32Array,
  offset: number,
  type: string,
  value: number | number[],
): void {
  const idx = offset / 4;
  if (typeof value === "number") {
    if (type === "i32") i32[idx] = value;
    else if (type === "u32") u32[idx] = value;
    else f32[idx] = value;
    return;
  }
  // Array value (vec2f, vec3f, vec4f, etc.)
  const view = vecView(type, f32, i32, u32);
  for (let i = 0; i < value.length; i++) view[idx + i] = value[i];
}

/** Select the correct typed array view for a vec type. */
function vecView(
  type: string,
  f32: Float32Array,
  i32: Int32Array,
  u32: Uint32Array,
): Float32Array | Int32Array | Uint32Array {
  if (type.includes("i")) return i32;
  if (type.includes("u")) return u32;
  return f32;
}

/** Get the initial value for a control. */
function controlInitial(c: UniformControl): number | number[] {
  if (c.kind === "color") return [...c.initial];
  return c.initial;
}

/** Synthetic AnnotatedLayout for the default {resolution, time} struct. */
function defaultAnnotatedLayout(): AnnotatedLayout {
  return {
    structName: "Uniforms",
    layout: {
      fields: [
        { name: "resolution", offset: 0, size: 8 },
        { name: "time", offset: 8, size: 4 },
      ],
      bufferSize: 16,
      alignment: 8,
    },
    controls: [],
    fields: [
      {
        kind: "auto",
        name: "resolution",
        offset: 0,
        size: 8,
        type: "vec2f",
        autoName: "resolution",
      },
      {
        kind: "auto",
        name: "time",
        offset: 8,
        size: 4,
        type: "f32",
        autoName: "time",
      },
    ],
  };
}
