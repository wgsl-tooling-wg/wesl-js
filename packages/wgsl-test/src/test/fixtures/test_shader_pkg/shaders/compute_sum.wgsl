@buffer var<storage, read_write> results: array<u32, 2>;

@compute @workgroup_size(1)
fn main() {
  results[0] = 1u + 2u;
  results[1] = 10u + 20u;
}
