@group(0) @binding(0) var<uniform> u: test::Uniforms;

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let st = pos.xy / u.resolution;
  let red = vec4f(1.0, 0.0, 0.0, 1.0);
  let blue = vec4f(0.0, 0.0, 1.0, 1.0);
  return mix(red, blue, st.x);
}
