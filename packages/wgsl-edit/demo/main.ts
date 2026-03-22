import "wgsl-edit";
import "wgsl-play";
import type { WgslEdit } from "wgsl-edit";

const editor = document.querySelector("wgsl-edit") as WgslEdit | null;

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
