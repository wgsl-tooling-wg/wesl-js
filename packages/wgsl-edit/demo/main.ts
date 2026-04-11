/// <reference types="wesl-plugin/suffixes" />
import "wgsl-edit";
import "wgsl-play";
import type { WgslEdit } from "wgsl-edit";
import shaderConfig from "./shaders/main.wesl?link";

const editor = document.querySelector("wgsl-edit") as WgslEdit | null;
if (editor) editor.project = shaderConfig;

const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

function applyTheme(dark: boolean) {
  const theme = dark ? "dark" : "light";
  if (editor) editor.theme = theme;
  document.body.className = theme;
  document.getElementById("prism-light")!.toggleAttribute("disabled", dark);
  document.getElementById("prism-dark")!.toggleAttribute("disabled", !dark);
}

// Start with system preference
applyTheme(isDark());

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  applyTheme(document.body.className !== "dark");
});
