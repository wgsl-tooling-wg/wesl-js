import package::util::gradient;
import env::u;

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  return vec4f(gradient(uv), 1.0);
}
