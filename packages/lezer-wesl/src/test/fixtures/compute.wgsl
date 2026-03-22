// Compute shader example
struct Params {
  count: u32,
  scale: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if idx >= params.count {
    return;
  }

  var value = input[idx];
  value = value * params.scale;
  output[idx] = value;
}
