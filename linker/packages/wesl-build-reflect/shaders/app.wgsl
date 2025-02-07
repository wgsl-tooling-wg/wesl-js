struct MyStruct {
  firstMember: u32,
}

@compute @workgroup_size(1)
fn main() {
  let a = MyStruct(1);
}