// Test importing from sanitized scoped package name
import test_scope__my_shaders::color::rgbToGrayscale;

fn testGrayscale() -> f32 {
  let white = vec3f(1.0, 1.0, 1.0);
  return rgbToGrayscale(white);
}
