import wgsl_test::expect;

@test fn passingTest() { expect(true); }

@test fn failingTest() { expect(false); }
