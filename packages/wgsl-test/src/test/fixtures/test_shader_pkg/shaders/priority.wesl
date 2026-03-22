// This module contains a "sub" item (not a namespace, just a const)
// Per spec: items take priority over filesystem
// So "import priority::sub" should resolve to THIS const, not priority/sub.wesl

const sub = 777u;

fn priorityFunc() -> u32 {
  return 700u;
}
