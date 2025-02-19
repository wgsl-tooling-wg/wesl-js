import package::mesh_view_bindings as Bindings;
import utils::{hsv2rgb};

// NOTE: Keep in sync with package/src/light.rs
fn view_z_to_z_slice(view_z: f32, is_orthographic: bool) -> u32 {
    var z_slice: u32 = 0u;
    if (is_orthographic) {
        // NOTE: view_z is correct in the orthographic case
        z_slice = u32(floor((view_z - Bindings::lights.cluster_factors.z) * Bindings::lights.cluster_factors.w));
    } else {
        // NOTE: had to use -view_z to make it positive else log(negative) is nan
        z_slice = u32(log(-view_z) * Bindings::lights.cluster_factors.z - Bindings::lights.cluster_factors.w + 1.0);
    }
    // NOTE: We use min as we may limit the far z plane used for clustering to be closeer than
    // the furthest thing being drawn. This means that we need to limit to the maximum cluster.
    return min(z_slice, Bindings::lights.cluster_dimensions.z - 1u);
}

fn fragment_cluster_index(frag_coord: vec2<f32>, view_z: f32, is_orthographic: bool) -> u32 {
    let xy = vec2<u32>(floor(frag_coord * Bindings::lights.cluster_factors.xy));
    let z_slice = view_z_to_z_slice(view_z, is_orthographic);
    // NOTE: Restricting cluster index to avoid undefined behavior when accessing uniform buffer
    // arrays based on the cluster index.
    return min(
        (xy.y * Bindings::lights.cluster_dimensions.x + xy.x) * Bindings::lights.cluster_dimensions.z + z_slice,
        Bindings::lights.cluster_dimensions.w - 1u
    );
}

// this must match CLUSTER_COUNT_SIZE in light.rs
const CLUSTER_COUNT_SIZE = 9u;
fn unpack_offset_and_counts(cluster_index: u32) -> vec3<u32> {

    return Bindings::cluster_offsets_and_counts.data[cluster_index].xyz;
}

fn get_light_id(index: u32) -> u32 {
    return Bindings::cluster_light_index_lists.data[index];
}

fn cluster_debug_visualization(
    output_color: vec4<f32>,
    view_z: f32,
    is_orthographic: bool,
    offset_and_counts: vec3<u32>,
    cluster_index: u32,
) -> vec4<f32> {
    // Cluster allocation debug (using 'over' alpha blending)
    // NOTE: This debug mode visualises the z-slices
    let cluster_overlay_alpha = 0.1;
    var z_slice: u32 = view_z_to_z_slice(view_z, is_orthographic);
    // A hack to make the colors alternate a bit more
    if ((z_slice & 1u) == 1u) {
        z_slice = z_slice + Bindings::lights.cluster_dimensions.z / 2u;
    }
    let slice_color = hsv2rgb(f32(z_slice) / f32(Bindings::lights.cluster_dimensions.z + 1u), 1.0, 0.5);
    output_color = vec4<f32>(
        (1.0 - cluster_overlay_alpha) * output_color.rgb + cluster_overlay_alpha * slice_color,
        output_color.a
    );

    return output_color;
}
