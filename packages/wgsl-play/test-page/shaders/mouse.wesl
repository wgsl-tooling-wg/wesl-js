import env::u;

@uniforms struct MouseDemo {
  @auto resolution: vec2f,
  @auto time: f32,
  @auto(mouse_pos) mouse: vec2f,
  @auto(mouse_button) button: i32,
}

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let mouse_uv = u.mouse / u.resolution;
  let d = distance(uv, mouse_uv);
  let glow = exp(-d * 8.0);
  let pulse = sin(u.time * 3.0) * 0.15 + 0.85;
  let warm = vec3f(1.0, 0.4, 0.1);
  let cool = vec3f(0.1, 0.5, 1.0);
  let tint = select(cool, warm, u.button > 0);
  let color = glow * pulse * tint + 0.03;
  return vec4f(color, 1.0);
}
