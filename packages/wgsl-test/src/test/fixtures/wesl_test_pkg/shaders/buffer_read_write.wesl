import wgsl_test::expectNear;

@buffer var<storage, read_write> data: array<f32, 4>;

@test fn write_and_read() {
  data[0] = 42.0;
  expectNear(data[0], 42.0);
}
