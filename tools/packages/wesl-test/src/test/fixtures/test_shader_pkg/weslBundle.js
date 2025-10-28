export const weslBundle = {
  name: "test_shader_pkg",
  edition: "unstable_2025",
  modules: {
    utils: `fn helper() -> u32 {
  return 43u;
}
`,
    math: `fn compute() -> u32 {
  return 59u;
}
`,
  },
};

export default weslBundle;
