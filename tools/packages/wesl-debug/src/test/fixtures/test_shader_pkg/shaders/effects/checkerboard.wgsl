@group(0) @binding(0) var<uniform> u: test::Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let size = 32.0;
  let tx = i32(pos.x / size) % 2;
  let ty = i32(pos.y / size) % 2;
  let is_white = (tx + ty) % 2 == 0;
  let color = select(vec3f(0.0), vec3f(1.0), is_white);
  return vec4f(color, 1.0);
}
