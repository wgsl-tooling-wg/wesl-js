import wgsl_test::expectNear;

@test_texture(gradient, 256, 256) var grad: texture_2d<f32>;
@sampler(linear)                  var samp: sampler;
@buffer                           var<storage, read_write> data: array<f32, 4>;

@test fn compute_write() {
  data[0] = 42.0;
  expectNear(data[0], 42.0);
}

@snapshot @fragment @extent(64, 64) 
fn test_visual(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / 64.0;
  return textureSampleLevel(grad, samp, uv, 0.0);
}
