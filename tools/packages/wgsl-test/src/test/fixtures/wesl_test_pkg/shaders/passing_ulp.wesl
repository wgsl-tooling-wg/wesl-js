import wgsl_test::expectUlp;

@test fn withinOneUlp() {
  // 1.0 and the next representable float differ by 1 ULP
  let a = 1.0;
  let b = bitcast<f32>(bitcast<u32>(a) + 1u);  // next float after 1.0
  expectUlp(a, b, 1u);
}

@test fn exactMatch() {
  expectUlp(42.0, 42.0, 0u);
}
