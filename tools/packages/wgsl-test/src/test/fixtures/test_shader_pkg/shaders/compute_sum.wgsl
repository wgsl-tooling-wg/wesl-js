@compute @workgroup_size(1)
fn main() {
  test::results[0] = 1u + 2u;
  test::results[1] = 10u + 20u;
}
