/// <reference types="wesl-plugin/suffixes" />
import code from "../shaders/app.wesl?static";

main();

async function main(): Promise<void> {
  displayShaderCode(code);
}

function displayShaderCode(src: string): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) {
    app.innerHTML = `<pre>${src}<pre>`;
  }
}