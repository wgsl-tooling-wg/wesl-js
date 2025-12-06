import "../src/index.ts";
import type { WgslPlay } from "../src/WgslPlay.ts";

const player = document.querySelector<WgslPlay>("#player")!;

document.querySelector("#play")!.addEventListener("click", () => player.play());
document
  .querySelector("#pause")!
  .addEventListener("click", () => player.pause());
document
  .querySelector("#rewind")!
  .addEventListener("click", () => player.rewind());
