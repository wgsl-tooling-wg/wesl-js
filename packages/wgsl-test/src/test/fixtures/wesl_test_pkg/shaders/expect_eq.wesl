import wgsl_test::expectEq;

@test fn equalInts() {
  expectEq(42u, 42u);
}

@test fn unequalInts() {
  expectEq(42u, 99u);
}
