/** Number of vertices drawn for fullscreen quad using triangle-strip topology */
export const fullscreenVertexCount = 4;

/** Fullscreen triangle vertex shader that covers viewport with 3 vertices, no vertex buffer needed */
export const fullscreenTriangleVertex = `
  @vertex
  fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    // Covers viewport with 3 vertices, no vertex buffer needed
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
