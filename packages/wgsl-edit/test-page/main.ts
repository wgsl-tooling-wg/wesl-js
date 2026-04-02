import "../src/index.ts";

customElements.whenDefined("wgsl-edit").then(() => {
  const el = document.querySelector("#editor5") as any;
  if (!el) return;
  el.project = {
    weslSrc: {
      "auto-test.wesl": "fn auto_original() -> f32 {\n  return 1.0;\n}\n",
    },
    shaderRoot: "shaders",
  };
});
