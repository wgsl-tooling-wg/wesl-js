import package::TestResult::testResult;

const relTol: f32 = 1e-3;
const absTol: f32 = 1e-6;

fn expect(condition: bool) {
  if (!condition && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectEq(actual: u32, expected: u32) {
  testResult.actual = vec4f(f32(actual), 0.0, 0.0, 0.0);
  testResult.expected = vec4f(f32(expected), 0.0, 0.0, 0.0);
  if (actual != expected && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectWithin(actual: f32, expected: f32, relTol: f32, absTol: f32) {
  testResult.actual = vec4f(actual, 0.0, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0, 0.0);
  let diff = abs(actual - expected);
  let tolerance = max(absTol, relTol * max(abs(actual), abs(expected)));
  if (diff > tolerance && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNear(actual: f32, expected: f32) {
  expectWithin(actual, expected, relTol, absTol);
}

fn expectWithinVec2(actual: vec2f, expected: vec2f, relTol: f32, absTol: f32) {
  testResult.actual = vec4f(actual, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0);
  let diff = abs(actual - expected);
  let tolerance = max(vec2f(absTol), relTol * max(abs(actual), abs(expected)));
  if (any(diff > tolerance) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec2(actual: vec2f, expected: vec2f) {
  expectWithinVec2(actual, expected, relTol, absTol);
}

fn expectWithinVec3(actual: vec3f, expected: vec3f, relTol: f32, absTol: f32) {
  testResult.actual = vec4f(actual, 0.0);
  testResult.expected = vec4f(expected, 0.0);
  let diff = abs(actual - expected);
  let tolerance = max(vec3f(absTol), relTol * max(abs(actual), abs(expected)));
  if (any(diff > tolerance) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec3(actual: vec3f, expected: vec3f) {
  expectWithinVec3(actual, expected, relTol, absTol);
}

fn expectWithinVec4(actual: vec4f, expected: vec4f, relTol: f32, absTol: f32) {
  testResult.actual = actual;
  testResult.expected = expected;
  let diff = abs(actual - expected);
  let tolerance = max(vec4f(absTol), relTol * max(abs(actual), abs(expected)));
  if (any(diff > tolerance) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec4(actual: vec4f, expected: vec4f) {
  expectWithinVec4(actual, expected, relTol, absTol);
}

// ULP (Units in Last Place) comparison - measures how many representable floats apart
fn ulpDiff(actual: f32, expected: f32) -> u32 {
  let aBits = bitcast<i32>(actual);
  let bBits = bitcast<i32>(expected);
  return u32(abs(aBits - bBits));
}

fn expectUlp(actual: f32, expected: f32, maxUlp: u32) {
  testResult.actual = vec4f(actual, 0.0, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0, 0.0);
  if (actual == expected) { return; }  // handles +0 == -0, exact match
  let diff = ulpDiff(actual, expected);
  if (diff > maxUlp && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectUlpVec2(actual: vec2f, expected: vec2f, maxUlp: u32) {
  testResult.actual = vec4f(actual, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0);
  if (all(actual == expected)) { return; }
  let d0 = ulpDiff(actual.x, expected.x);
  let d1 = ulpDiff(actual.y, expected.y);
  if ((d0 > maxUlp || d1 > maxUlp) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectUlpVec3(actual: vec3f, expected: vec3f, maxUlp: u32) {
  testResult.actual = vec4f(actual, 0.0);
  testResult.expected = vec4f(expected, 0.0);
  if (all(actual == expected)) { return; }
  let d0 = ulpDiff(actual.x, expected.x);
  let d1 = ulpDiff(actual.y, expected.y);
  let d2 = ulpDiff(actual.z, expected.z);
  if ((d0 > maxUlp || d1 > maxUlp || d2 > maxUlp) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectUlpVec4(actual: vec4f, expected: vec4f, maxUlp: u32) {
  testResult.actual = actual;
  testResult.expected = expected;
  if (all(actual == expected)) { return; }
  let d0 = ulpDiff(actual.x, expected.x);
  let d1 = ulpDiff(actual.y, expected.y);
  let d2 = ulpDiff(actual.z, expected.z);
  let d3 = ulpDiff(actual.w, expected.w);
  if ((d0 > maxUlp || d1 > maxUlp || d2 > maxUlp || d3 > maxUlp) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}
