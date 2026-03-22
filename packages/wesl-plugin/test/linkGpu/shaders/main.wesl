import package::uniforms::Uniforms;

@group(0) @binding(0) var <uniform> u: Uniforms;

@compute @workgroup_size(1)
fn main() { }