fn rgbToGrayscale(rgb: vec3f) -> f32 {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

fn hueToRgb(p: f32, q: f32, t: f32) -> f32 {
  var t_adj = t;
  if (t_adj < 0.0) { t_adj += 1.0; }
  if (t_adj > 1.0) { t_adj -= 1.0; }
  if (t_adj < 1.0 / 6.0) { return p + (q - p) * 6.0 * t_adj; }
  if (t_adj < 1.0 / 2.0) { return q; }
  if (t_adj < 2.0 / 3.0) { return p + (q - p) * (2.0 / 3.0 - t_adj) * 6.0; }
  return p;
}
