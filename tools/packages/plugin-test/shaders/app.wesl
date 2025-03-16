import package::uniforms::Uniforms;

struct MyBindings {
  @group(0) @binding(0) particles: ptr<storage, array<u32>, read_write>, 
  @group(0) @binding(1) uniforms: ptr<uniform, Uniforms>, 
}

@workgroup_size(1)
@compute fn main(b: MyBindings) {
  b.particles[0] = b.uniforms.foo;
}