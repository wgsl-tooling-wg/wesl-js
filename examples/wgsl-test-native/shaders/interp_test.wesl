import package::interp::{remap, smootherstep};
import wgsl_test::expectNear;

@test 
fn remapMidpoint() {
  expectNear(remap(5.0, 0.0, 10.0, 0.0, 100.0), 50.0);
}

@test 
fn remapEdges() {
  expectNear(remap(0.0, 0.0, 10.0, 20.0, 40.0), 20.0);
}

@test
fn smootherstepQuarter() {
  expectNear(smootherstep(0.0, 1.0, 0.25), 0.103516);
}
