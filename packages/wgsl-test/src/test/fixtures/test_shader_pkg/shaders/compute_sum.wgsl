@compute @workgroup_size(1)
fn main() {
  env::results[0] = 1u + 2u;
  env::results[1] = 10u + 20u;
}
