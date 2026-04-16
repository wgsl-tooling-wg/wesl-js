@test_texture(lemur, 512)                   var photo: texture_2d<f32>;
@test_texture(checkerboard, 256, 256, 16)   var pattern: texture_2d<f32>;
@sampler(linear)                            var samp: sampler;

@snapshot @fragment @extent(256, 256) 
fn test_blend(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 256.0;
  let a = textureSampleLevel(photo, samp, uv, 0.0);
  let b = textureSampleLevel(pattern, samp, uv, 0.0);
  return mix(a, b, 0.5);
}