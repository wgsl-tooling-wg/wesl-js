import wgsl_test::expectUlp;

@test fn tooFar() {
  // 1.0 and 1.0 + 3 ULP should fail with maxUlp=1
  let a = 1.0;
  let b = bitcast<f32>(bitcast<u32>(a) + 3u);
  expectUlp(a, b, 1u);
}
