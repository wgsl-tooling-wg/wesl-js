import "../src/index.ts";

customElements.whenDefined("wgsl-edit").then(() => {
  const el5 = document.querySelector("#editor5") as any;
  if (el5) {
    el5.project = {
      weslSrc: {
        "auto-test.wesl": "fn auto_original() -> f32 {\n  return 1.0;\n}\n",
      },
      shaderRoot: "shaders",
    };
  }

  const el6 = document.querySelector("#editor6") as any;
  if (el6) {
    el6.project = {
      weslSrc: {
        "main.wesl": "fn main_orig() -> f32 { return 1.0; }\n",
        "shape.wesl": "fn shape_orig() -> f32 { return 2.0; }\n",
      },
      rootModuleName: "main",
    };
  }
});
