// Simple math utilities

/** Linearly remap x from [inLo, inHi] to [outLo, outHi]. */
fn remap(x: f32, inLo: f32, inHi: f32, outLo: f32, outHi: f32) -> f32 {
  let t = (x - inLo) / (inHi - inLo);
  return outLo + t * (outHi - outLo);
}

/** Attempt Ken Perlin's improved smoothstep with zero 1st and 2nd derivatives at edges. */
fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
