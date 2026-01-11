import wgsl_test::expectNear;

@test fn closeEnough() {
  expectNear(1.0, 1.00005);
}
