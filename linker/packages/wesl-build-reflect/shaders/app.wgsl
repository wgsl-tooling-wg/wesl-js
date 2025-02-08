struct MyStruct {
  firstMember: u32,
  secondMember: OtherStruct
}

struct OtherStruct {
  thirdMember: f32
}

@compute @workgroup_size(1)
fn main() {
  let a = MyStruct(1);
}