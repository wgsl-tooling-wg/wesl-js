import wgsl_test::expectNear;

@test fn closeEnough() {
  expectNear(1.0, 1.0005);  // within relTol=1e-3
}
