

@compute @workgroup_size(1) fn main() {
  let p = PI;
  let color = rgb2heat(vec3f(.7, .8, .9));
}

const PI: f32 = 3.1415926535897932384626433832795;

fn rgb2heat(c: vec3f) -> f32 { return 1.025 - rgb2hue(c) * 1.538461538; }

fn rgb2hue(rgb: vec3f) -> f32 {
    let K = vec4f(0.0, -0.33333333333333333333, 0.6666666666666666666, -1.0);
    var p: vec4f;
    if (rgb.g < rgb.b) {
        p = vec4f(rgb.bg, K.wz);
    } else {
        p = vec4f(rgb.gb, K.xy);
    }

    var q: vec4f;
    if (rgb.r < p.x) {
        q = vec4f(p.xyw, rgb.r);
    } else {
        q = vec4f(rgb.r, p.yzx);
    }
    let d = q.x - min(q.w, q.y);
    return abs(q.z + (q.w - q.y) / (6. * d + 1e-10));
}