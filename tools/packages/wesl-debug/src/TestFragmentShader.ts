import { type WgslElementType, withTextureCopy } from "thimbleberry";
import { compileShader } from "./CompileShader.ts";
import { withErrorScopes } from "./ErrorScopes.ts";

const fullscreenTriangleVertex = `
@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  // Fullscreen triangle: covers viewport with 3 vertices, no vertex buffer needed
  // Vertex 0: bottom-left (-1, -1)
  // Vertex 1: bottom-right beyond viewport (3, -1)
  // Vertex 2: top-left beyond viewport (-1, 3)
  var pos: vec2f;
  if (idx == 0u) {
    pos = vec2f(-1.0, -1.0);
  } else if (idx == 1u) {
    pos = vec2f(3.0, -1.0);
  } else {
    pos = vec2f(-1.0, 3.0);
  }
  return vec4f(pos, 0.0, 1.0);
}`;

export interface FragmentTestParams {
  projectDir: string;
  device: GPUDevice;
  src: string;
  resultFormat?: WgslElementType;
  size?: [width: number, height: number];
  conditions?: Record<string, boolean>;
}

/**
 * Executes a fragment shader test and returns pixel (0,0) values for validation.
 * Renders to RGBA32Float texture using a fullscreen triangle.
 * Default: [1, 1] texture for simple color tests
 * Use [2, 2] for derivative tests (forms a complete 2x2 quad for dpdx/dpdy)
 */
export async function testFragmentShader(
  params: FragmentTestParams,
): Promise<number[]> {
  const {
    projectDir,
    device,
    src,
    resultFormat = "f32",
    size = [1, 1],
    conditions = {},
  } = params;
  const [width, height] = size;

  // Put user's fragment shader first as it may contain import statements
  const completeSrc = src + "\n\n" + fullscreenTriangleVertex;

  const shaderParams = { projectDir, device, src: completeSrc, conditions };
  const module = await compileShader(shaderParams);
  return await runSimpleRenderPipeline(
    device,
    module,
    resultFormat,
    width,
    height,
  );
}

/**
 * Executes a render pipeline with the given shader module.
 * Creates an RGBA32Float texture, renders to it, and reads back pixel (0,0).
 */
export async function runSimpleRenderPipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  resultFormat: WgslElementType = "f32",
  width = 1,
  height = 1,
): Promise<number[]> {
  return await withErrorScopes(device, async () => {
    const texture = device.createTexture({
      label: "fragment-test-output",
      size: { width, height, depthOrArrayLayers: 1 },
      format: "rgba32float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module },
      fragment: {
        module,
        targets: [{ format: "rgba32float" }],
      },
      primitive: { topology: "triangle-list" },
    });

    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.draw(3);
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

    const extractCount = resultFormatComponents(resultFormat);
    const data = await withTextureCopy(device, texture, texData =>
      Array.from(texData.slice(0, extractCount)),
    );

    texture.destroy();
    return data;
  });
}

function resultFormatComponents(format: WgslElementType): number {
  if (format === "f32" || format === "u32" || format === "i32") return 1;
  if (format === "vec2f" || format === "vec2u" || format === "vec2i") return 2;
  if (format === "vec3f" || format === "vec3u" || format === "vec3i") return 3;
  if (format === "vec4f" || format === "vec4u" || format === "vec4i") return 4;
  return 1;
}
