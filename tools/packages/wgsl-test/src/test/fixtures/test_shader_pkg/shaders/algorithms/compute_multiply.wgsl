@compute @workgroup_size(1)
fn main() {
  env::results[0] = 3u * 4u;
  env::results[1] = 5u * 6u;
}
