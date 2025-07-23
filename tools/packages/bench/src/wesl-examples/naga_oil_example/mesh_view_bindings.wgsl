import package::mesh_view_types as Types;

@group(0) @binding(0)
var<uniform> view: Types::View;
@group(0) @binding(1)
var<uniform> lights: Types::Lights;

@group(0) @binding(2)
var point_shadow_textures: texture_depth_cube_array;

@group(0) @binding(3)
var point_shadow_textures_sampler: sampler_comparison;

@group(0) @binding(4)
var directional_shadow_textures: texture_depth_2d_array;

@group(0) @binding(5)
var directional_shadow_textures_sampler: sampler_comparison;

@group(0) @binding(6)
var<storage> point_lights: Types::PointLights;
@group(0) @binding(7)
var<storage> cluster_light_index_lists: Types::ClusterLightIndexLists;
@group(0) @binding(8)
var<storage> cluster_offsets_and_counts: Types::ClusterOffsetsAndCounts;
