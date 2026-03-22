export interface RenderFrameParams {
  device: GPUDevice;
  pipeline: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
  targetView: GPUTextureView;
}

/** Execute one fullscreen fragment render pass to target view. */
export function renderFrame(params: RenderFrameParams): void {
  const { device, pipeline, bindGroup, targetView } = params;

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: targetView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(pipeline);
  if (bindGroup) pass.setBindGroup(0, bindGroup);
  pass.draw(3);
  pass.end();

  device.queue.submit([encoder.finish()]);
}
