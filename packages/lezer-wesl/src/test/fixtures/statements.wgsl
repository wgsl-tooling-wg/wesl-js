// Control flow and expressions
const PI: f32 = 3.14159;
const TAU: f32 = PI * 2.0;

override workgroup_size: u32 = 64u;

alias float2 = vec2<f32>;

fn control_flow(x: i32) -> i32 {
  // if/else
  if x < 0 {
    return -x;
  } else if x == 0 {
    return 1;
  } else {
    discard;
  }

  // for loop
  var sum = 0;
  for (var i = 0; i < 10; ) {
    sum += i;
    i += 1;
    if i == 5 {
      continue;
    }
  }

  // while loop
  var n = x;
  while n > 0 {
    n = n - 1;
  }

  // loop with break
  loop {
    if sum > 100 {
      break;
    }
    sum += 1;
  }

  // switch
  switch x {
    case 0, 1 {
      return 0;
    }
    case 2: {
      return 2;
    }
    default {
      return x;
    }
  }
}

fn expressions() {
  // arithmetic
  let a = 1 + 2 - 3 * 4 / 5 % 6;

  // comparison (WGSL requires parens when mixing && and ||)
  let b = (1 < 2 && 3 <= 4) || (5 > 6 && 7 >= 8);
  let c = (a == b) || (a != b);

  // bitwise (WGSL requires parens when mixing &, |, ^)
  let d = (0xFFu & 0x0Fu) | (0xF0u ^ 0xAAu);
  let e = (1u << 4u) >> 2u;

  // unary
  let f = -a;
  let g = !true;
  let h = ~0xFFFFu;

  // member and index access
  var v = vec3(1.0, 2.0, 3.0);
  let vx = v.x;
  let xy = v.xy;
  var arr: array<f32, 4>;
  let elem = arr[0];

  // assignment operators
  var m = 10;
  m += 1;
  m -= 2;
  m *= 3;
  m /= 4;
  m++;
  m--;
}
