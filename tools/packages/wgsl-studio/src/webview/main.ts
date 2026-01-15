import { WgslPlay } from "wgsl-play/bundle";

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
const vscode = acquireVsCodeApi();

console.log("[wesl-vscode] webview loading...");

customElements.define("wgsl-play", WgslPlay);
const player = document.createElement("wgsl-play") as WgslPlay;
document.body.appendChild(player);
console.log("[wesl-vscode] wgsl-play element created and appended");

player.addEventListener("ready", () => {
  console.log("[wesl-vscode] ready event received");
  vscode.postMessage({ type: "ready" });
});

player.addEventListener("compile-error", (e: Event) => {
  const { message } = (e as CustomEvent).detail;
  console.log("[wesl-vscode] compile-error:", message);
  vscode.postMessage({ type: "compileError", message });
});

player.addEventListener("init-error", (e: Event) => {
  const { message } = (e as CustomEvent).detail;
  console.log("[wesl-vscode] init-error:", message);
  vscode.postMessage({ type: "initError", message });
});

window.addEventListener("message", e => {
  const msg = e.data;
  console.log("[wesl-vscode] message received:", msg.type);
  if (msg.type === "setProject") {
    console.log(
      "[wesl-vscode] setting project, rootModuleName:",
      msg.rootModuleName,
    );
    player.project = {
      weslSrc: msg.weslSrc,
      rootModuleName: msg.rootModuleName,
      packageName: msg.packageName,
      libs: msg.libs,
    };
  } else if (msg.type === "control") {
    if (msg.action === "play") player.play();
    else if (msg.action === "pause") player.pause();
    else if (msg.action === "rewind") player.rewind();
  }
});
