// Vertex and fragment shader
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) world_pos: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
}

struct Uniforms {
  model: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var tex_sampler: sampler;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let world = uniforms.model * vec4(in.position, 1.0);
  out.clip_position = uniforms.projection * uniforms.view * world;
  out.world_pos = world.xyz;
  out.uv = in.uv;
  out.normal = (uniforms.model * vec4(in.normal, 0.0)).xyz;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSample(tex, tex_sampler, in.uv);
  let light_dir = normalize(vec3(1.0, 1.0, 1.0));
  let diffuse = max(dot(normalize(in.normal), light_dir), 0.0);
  return vec4(color.rgb * diffuse, color.a);
}
