import package::utils;
import env::u;

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  return vec4f(utils::gradient(uv, u.time), 1.0);
}
