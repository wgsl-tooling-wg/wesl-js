struct Uniforms { frame: u32 }

struct Sprite { 
    pos: vec2f, 
}

@binding(0) @group(0) var<uniform> u: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    const pos = array<vec2f,4>(
        vec2(-1.0, -1.0),
        vec2(-1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(1.0, 1.0),
    );

    return vec4f(pos[vertex_index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    mixing();
    let rand = random_wgsl::pcg_2u_3f(vec2u(pos.xy) + u.frame);
    return vec4(rand, 1);
}


// to show linker resolving name conflict - random_wgsl also has a fn named 'mixing' 
fn mixing() { }