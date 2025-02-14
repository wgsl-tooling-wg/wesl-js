import package::mesh_view_types;
import package::mesh_types;

@group(0) @binding(0)
var<uniform> view: View;

@group(1) @binding(0)
var<uniform> mesh: Mesh;

@group(1) @binding(1)
var<uniform> joint_matrices: SkinnedMesh;
import package::skinning;

// NOTE: Bindings must come before functions that use them!
import package::mesh_functions;

struct Vertex {
    @location(0) position: vec3<f32>,
    @location(4) joint_indices: vec4<u32>,
    @location(5) joint_weights: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
};

@vertex
fn vertex(vertex: Vertex) -> VertexOutput {
    let model = skin_model(vertex.joint_indices, vertex.joint_weights);
    var out: VertexOutput;
    out.clip_position = mesh_position_local_to_clip(model, vec4<f32>(vertex.position, 1.0));
    return out;
}
