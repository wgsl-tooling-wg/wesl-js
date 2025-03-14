import random_wgsl::pcg_2u_3f;
import package::util::stuff::mobileStart;

@if(MOBILE) const start = mobileStart;
@if(!MOBILE) const start = vec2u(3, 3);

fn main() {
   let a = pcg_2u_3f(start);
}