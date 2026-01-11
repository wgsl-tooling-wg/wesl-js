import package::TestResult::{EPSILON, testResult};

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

fn expectNear(actual: f32, expected: f32) {
  testResult.actual = vec4f(actual, 0.0, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0, 0.0);
  let diff = abs(actual - expected);
  if (diff > EPSILON && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec2(actual: vec2f, expected: vec2f) {
  testResult.actual = vec4f(actual, 0.0, 0.0);
  testResult.expected = vec4f(expected, 0.0, 0.0);
  let diff = abs(actual - expected);
  if (any(diff > vec2f(EPSILON)) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec3(actual: vec3f, expected: vec3f) {
  testResult.actual = vec4f(actual, 0.0);
  testResult.expected = vec4f(expected, 0.0);
  let diff = abs(actual - expected);
  if (any(diff > vec3f(EPSILON)) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}

fn expectNearVec4(actual: vec4f, expected: vec4f) {
  testResult.actual = actual;
  testResult.expected = expected;
  let diff = abs(actual - expected);
  if (any(diff > vec4f(EPSILON)) && testResult.failCount == 0u) {
    testResult.passed = 0u;
    testResult.failCount = 1u;
  }
}
