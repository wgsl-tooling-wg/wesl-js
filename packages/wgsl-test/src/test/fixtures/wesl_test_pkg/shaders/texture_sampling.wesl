import wgsl_test::expectNear;

@test_texture(checkerboard, 256, 256, 16) var tex: texture_2d<f32>;
@sampler(nearest)                         var samp: sampler;

@test fn sample_checkerboard() {
  let color = textureSampleLevel(tex, samp, vec2f(0.5, 0.5), 0.0);
  expectNear(color.r, 0.0);
}
