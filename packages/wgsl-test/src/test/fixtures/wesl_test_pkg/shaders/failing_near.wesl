import wgsl_test::expectNear;

@test fn notClose() {
  expectNear(1.0, 2.0);
}
