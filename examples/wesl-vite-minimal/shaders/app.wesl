import package::utils::b;
import random_wgsl::pcg_2u_3f;

@compute
@workgroup_size(1) 
fn main() {
  let a = b + pcg_2u_3f(vec2u(1,3)).x;
}