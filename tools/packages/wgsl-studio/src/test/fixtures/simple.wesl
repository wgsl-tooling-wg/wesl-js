import wgsl_test::expect;

@test fn passes() { expect(true); }

@test fn alsoWorks() { expect(1 == 1); }
