fn gradient(uv: vec2f, time: f32) -> vec3f {
  return vec3f(uv, 0.5 + 0.5 * sin(time));
}
