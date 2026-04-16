@test_texture(checkerboard, 256, 256, 16) var tex: texture_2d<f32>;
@sampler(nearest)                         var samp: sampler;

@snapshot @fragment @extent(256, 256) 
fn test_checker(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 256.0;
  return textureSampleLevel(tex, samp, uv, 0.0);
}
