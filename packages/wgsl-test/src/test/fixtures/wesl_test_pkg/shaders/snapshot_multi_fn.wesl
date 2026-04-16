@test_texture(gradient, 256, 256)  var grad: texture_2d<f32>;
@sampler(linear)                   var samp: sampler;

@snapshot @fragment @extent(64, 64)
fn test_gradient(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 64.0;
  return textureSampleLevel(grad, samp, uv, 0.0);
}

@snapshot @fragment @extent(64, 64)
fn test_inverted(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 64.0;
  return 1.0 - textureSampleLevel(grad, samp, uv, 0.0);
}
