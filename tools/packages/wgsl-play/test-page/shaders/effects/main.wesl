// Main shader testing super:: imports
import super::common::tint;
import package::utils::gradient;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 128.0;
  let color = gradient(uv);
  let tinted = tint(color, 0.8);
  return vec4f(tinted, 1.0);
}
