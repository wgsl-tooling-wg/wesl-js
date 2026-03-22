import wgsl_test::expect;

@test fn first() { expect(true); }

@test fn second() { expect(false); }

@test fn third() { expect(true); }
