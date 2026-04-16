import wgsl_test::expectNear;

@test_texture(gradient, 256, 256)          var grad: texture_2d<f32>;
@sampler(linear)                           var samp: sampler;
@buffer var<storage, read_write> result: array<f32, 4>;

@test fn gradient_center() {
  let color = textureSampleLevel(grad, samp, vec2f(0.5, 0.5), 0.0);
  expectNear(color.r, 0.5);
}

@test fn gradient_corner() {
  let color = textureSampleLevel(grad, samp, vec2f(0.0, 0.0), 0.0);
  expectNear(color.r, 0.0);
}
