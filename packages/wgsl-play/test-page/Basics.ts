import type { WgslPlay } from "../src/index.ts";
import { expose } from "./Shared.ts";

const basicPlayer = document.querySelector<WgslPlay>("#basicPlayer")!;

const conditionsPlayer = document.querySelector<WgslPlay>("#conditionsPlayer")!;
document.querySelector("#load-red-condition")!.addEventListener("click", () => {
  conditionsPlayer.project = { conditions: { RED: true } };
});

const autoplayOffPlayer =
  document.querySelector<WgslPlay>("#autoplayOffPlayer")!;

expose({ basicPlayer, conditionsPlayer, autoplayOffPlayer });
