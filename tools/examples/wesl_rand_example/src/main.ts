import "@shoelace-style/shoelace";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { startApp } from "./App.ts";
import "../styles.css";

import { setBasePath } from "@shoelace-style/shoelace";
setBasePath("/shoelace-assets");

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
  <canvas id="canvas" width="150" height="150" style="width:300px; height:300px; image-rendering:pixelated"></canvas>
  <sl-icon-button id="stop" name="play" style="font-size: 2rem"></sl-icon-button>
  <div id="srcPanel"/>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop")!;
const srcPanel = document.querySelector<HTMLDivElement>("#srcPanel")!;

startApp(canvas, stopButton, srcPanel);
