@buffer var<storage, read_write> results: array<u32, 2>;

@compute @workgroup_size(1)
fn main() {
  results[0] = 3u * 4u;
  results[1] = 5u * 6u;
}
