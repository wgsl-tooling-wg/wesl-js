import package::uniforms::Uniforms;


@group(0) @binding(0) 
var<storage, read_write> particles: array<u32>;
@group(0) @binding(1) 
var<uniform> uniforms: Uniforms;


@workgroup_size(1, 1, 1)
@compute fn main() {
  particles[0] = uniforms.foo;
}