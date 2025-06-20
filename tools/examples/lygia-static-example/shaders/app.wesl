import lygia::math::consts::PI;
import lygia::color::space::rgb2heat::rgb2heat;

@compute @workgroup_size(1) 
fn main() {
  let p = PI;
  let color = rgb2heat(vec3f(.7, .8, .9));
}