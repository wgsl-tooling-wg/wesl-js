
import package::pbr_types as PbrTypes;
import package::mesh_types as MeshTypes;
import package::mesh_bindings as MeshBindings;
import package::mesh_view_types as ViewTypes;
import package::mesh_view_bindings as ViewBindings;
import package::pbr_lighting as Lighting;
import package::clustered_forward as Clustering;
import package::shadows as Shadows;

// NOTE: This ensures that the world_normal is normalized and if
// vertex tangents and normal maps then normal mapping may be applied.
fn prepare_normal(
    standard_material_flags: u32,
    world_normal: vec3<f32>,
    world_tangent: vec4<f32>,
    uv: vec2<f32>,
    is_front: bool,
) -> vec3<f32> {
    var N: vec3<f32> = normalize(world_normal);

    // NOTE: The mikktspace method of normal mapping explicitly requires that these NOT be
    // normalized nor any Gram-Schmidt applied to ensure the vertex normal is orthogonal to the
    // vertex tangent! Do not change this code unless you really know what you are doing.
    // http://www.mikktspace.com/
    var T: vec3<f32> = world_tangent.xyz;
    var B: vec3<f32> = world_tangent.w * cross(N, T);

    if ((standard_material_flags & PbrTypes::STANDARD_MATERIAL_FLAGS_DOUBLE_SIDED_BIT) != 0u) {
        if (!is_front) {
            N = -N;
            T = -T;
            B = -B;
        }
    }

    // Nt is the tangent-space normal.
    var Nt = textureSample(normal_map_texture, normal_map_sampler, uv).rgb;
    if ((standard_material_flags & PbrTypes::STANDARD_MATERIAL_FLAGS_TWO_COMPONENT_NORMAL_MAP) != 0u) {
        // Only use the xy components and derive z for 2-component normal maps.
        Nt = vec3<f32>(Nt.rg * 2.0 - 1.0, 0.0);
        Nt.z = sqrt(1.0 - Nt.x * Nt.x - Nt.y * Nt.y);
    } else {
        Nt = Nt * 2.0 - 1.0;
    }
    // Normal maps authored for DirectX require flipping the y component
    if ((standard_material_flags & PbrTypes::STANDARD_MATERIAL_FLAGS_FLIP_NORMAL_MAP_Y) != 0u) {
        Nt.y = -Nt.y;
    }
    // NOTE: The mikktspace method of normal mapping applies maps the tangent-space normal from
    // the normal map texture in this way to be an EXACT inverse of how the normal map baker
    // calculates the normal maps so there is no error introduced. Do not change this code
    // unless you really know what you are doing.
    // http://www.mikktspace.com/
    N = normalize(Nt.x * T + Nt.y * B + Nt.z * N);

    return N;
}

// NOTE: Correctly calculates the view vector depending on whether
// the projection is orthographic or perspective.
fn calculate_view(
    world_position: vec4<f32>,
    is_orthographic: bool,
) -> vec3<f32> {
    var V: vec3<f32>;
    if (is_orthographic) {
        // Orthographic view vector
        V = normalize(vec3<f32>(ViewBindings::view.view_proj[0].z, ViewBindings::view.view_proj[1].z, ViewBindings::view.view_proj[2].z));
    } else {
        // Only valid for a perpective projection
        V = normalize(ViewBindings::view.world_position.xyz - world_position.xyz);
    }
    return V;
}

struct PbrInput {
    material: PbrTypes::StandardMaterial,
    occlusion: f32,
    frag_coord: vec4<f32>,
    world_position: vec4<f32>,
    // Normalized world normal used for shadow mapping as normal-mapping is not used for shadow
    // mapping
    world_normal: vec3<f32>,
    // Normalized normal-mapped world normal used for lighting
    N: vec3<f32>,
    // Normalized view vector in world space, pointing from the fragment world position toward the
    // view world position
    V: vec3<f32>,
    is_orthographic: bool,
};

// Creates a PbrInput with default values
fn pbr_input_new() -> PbrInput {
    var pbr_input: PbrInput;

    pbr_input.material = PbrTypes::standard_material_new();
    pbr_input.occlusion = 1.0;

    pbr_input.frag_coord = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    pbr_input.world_position = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    pbr_input.world_normal = vec3<f32>(0.0, 0.0, 1.0);

    pbr_input.is_orthographic = false;

    pbr_input.N = vec3<f32>(0.0, 0.0, 1.0);
    pbr_input.V = vec3<f32>(1.0, 0.0, 0.0);

    return pbr_input;
}

fn pbr(
    in: PbrInput,
) -> vec4<f32> {
    var output_color: vec4<f32> = in.material.base_color;

    // T0DO use .a for exposure compensation in HDR
    let emissive = in.material.emissive;

    // calculate non-linear roughness from linear perceptualRoughness
    let metallic = in.material.metallic;
    let perceptual_roughness = in.material.perceptual_roughness;
    let roughness = Lighting::perceptualRoughnessToRoughness(perceptual_roughness);

    let occlusion = in.occlusion;

    if ((in.material.flags & PbrTypes::STANDARD_MATERIAL_FLAGS_ALPHA_MODE_OPAQUE) != 0u) {
        // NOTE: If rendering as opaque, alpha should be ignored so set to 1.0
        output_color.a = 1.0;
    } else if ((in.material.flags & PbrTypes::STANDARD_MATERIAL_FLAGS_ALPHA_MODE_MASK) != 0u) {
        if (output_color.a >= in.material.alpha_cutoff) {
            // NOTE: If rendering as masked alpha and >= the cutoff, render as fully opaque
            output_color.a = 1.0;
        } else {
            // NOTE: output_color.a < in.material.alpha_cutoff should not is not rendered
            // NOTE: This and any other discards mean that early-z testing cannot be done!
            discard;
        }
    }

    // Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
    let NdotV = max(dot(in.N, in.V), 0.0001);

    // Remapping [0,1] reflectance to F0
    // See https://google.github.io/filament/Filament.html#materialsystem/parameterization/remapping
    let reflectance = in.material.reflectance;
    let F0 = 0.16 * reflectance * reflectance * (1.0 - metallic) + output_color.rgb * metallic;

    // Diffuse strength inversely related to metallicity
    let diffuse_color = output_color.rgb * (1.0 - metallic);

    let R = reflect(-in.V, in.N);

    // accumulate color
    var light_accum: vec3<f32> = vec3<f32>(0.0);

    let view_z = dot(vec4<f32>(
        ViewBindings::view.inverse_view[0].z,
        ViewBindings::view.inverse_view[1].z,
        ViewBindings::view.inverse_view[2].z,
        ViewBindings::view.inverse_view[3].z
    ), in.world_position);
    let cluster_index = Clustering::fragment_cluster_index(in.frag_coord.xy, view_z, in.is_orthographic);
    let offset_and_counts = Clustering::unpack_offset_and_counts(cluster_index);

    // point lights
    for (var i: u32 = offset_and_counts[0]; i < offset_and_counts[0] + offset_and_counts[1]; i = i + 1u) {
        let light_id = Clustering::get_light_id(i);
        let light = ViewBindings::point_lights.data[light_id];
        var shadow: f32 = 1.0;
        if ((MeshBindings::mesh.flags & MeshTypes::MESH_FLAGS_SHADOW_RECEIVER_BIT) != 0u
                && (light.flags & ViewTypes::POINT_LIGHT_FLAGS_SHADOWS_ENABLED_BIT) != 0u) {
            shadow = Shadows::fetch_point_shadow(light_id, in.world_position, in.world_normal);
        }
        let light_contrib = Lighting::point_light(in.world_position.xyz, light, roughness, NdotV, in.N, in.V, R, F0, diffuse_color);
        light_accum = light_accum + light_contrib * shadow;
    }

    // spot lights
    for (var i: u32 = offset_and_counts[0] + offset_and_counts[1]; i < offset_and_counts[0] + offset_and_counts[1] + offset_and_counts[2]; i = i + 1u) {
        let light_id = Clustering::get_light_id(i);
        let light = ViewBindings::point_lights.data[light_id];
        var shadow: f32 = 1.0;
        if ((MeshBindings::mesh.flags & MeshTypes::MESH_FLAGS_SHADOW_RECEIVER_BIT) != 0u
                && (light.flags & ViewTypes::POINT_LIGHT_FLAGS_SHADOWS_ENABLED_BIT) != 0u) {
            shadow = Shadows::fetch_spot_shadow(light_id, in.world_position, in.world_normal);
        }
        let light_contrib = Lighting::spot_light(in.world_position.xyz, light, roughness, NdotV, in.N, in.V, R, F0, diffuse_color);
        light_accum = light_accum + light_contrib * shadow;
    }

    let n_directional_lights = ViewBindings::lights.n_directional_lights;
    for (var i: u32 = 0u; i < n_directional_lights; i = i + 1u) {
        let light = ViewBindings::lights.directional_lights[i];
        var shadow: f32 = 1.0;
        if ((MeshBindings::mesh.flags & MeshTypes::MESH_FLAGS_SHADOW_RECEIVER_BIT) != 0u
                && (light.flags & ViewTypes::DIRECTIONAL_LIGHT_FLAGS_SHADOWS_ENABLED_BIT) != 0u) {
            shadow = Shadows::fetch_directional_shadow(i, in.world_position, in.world_normal);
        }
        let light_contrib = Lighting::directional_light(light, roughness, NdotV, in.N, in.V, R, F0, diffuse_color);
        light_accum = light_accum + light_contrib * shadow;
    }

    let diffuse_ambient = Lighting::EnvBRDFApprox(diffuse_color, 1.0, NdotV);
    let specular_ambient = Lighting::EnvBRDFApprox(F0, perceptual_roughness, NdotV);

    output_color = vec4<f32>(
        light_accum +
            (diffuse_ambient + specular_ambient) * ViewBindings::lights.ambient_color.rgb * occlusion +
            emissive.rgb * output_color.a,
        output_color.a);

    output_color = Clustering::cluster_debug_visualization(
        output_color,
        view_z,
        in.is_orthographic,
        offset_and_counts,
        cluster_index,
    );

    return output_color;
}

fn tone_mapping(in: vec4<f32>) -> vec4<f32> {
    // tone_mapping
    return vec4<f32>(Lighting::reinhard_luminance(in.rgb), in.a);
    
    // Gamma correction.
    // Not needed with sRGB buffer
    // output_color.rgb = pow(output_color.rgb, vec3(1.0 / 2.2));
}
