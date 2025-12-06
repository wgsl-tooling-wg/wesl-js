@compute @workgroup_size(1)
fn main() {
  test::results[0] = 3u * 4u;
  test::results[1] = 5u * 6u;
}
