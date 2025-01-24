import ./uniforms/Uniforms;

struct MyBindings {
  @group(0) @binding(0) particles: ptr<storage, array<u32>, read_write>, 
  @group(0) @binding(1) uniforms: ptr<uniform, Uniforms>, 
  @group(0) @binding(2) tex: texture_2d<rgba8unorm>,
  @group(0) @binding(3) samp: sampler,
  @group(0) @binding(4) stTex: texture_storage_2d<rgba8unorm, read>,
}

@compute fn main(b: MyBindings) {
  b.particles[0] = b.uniforms.foo;
}