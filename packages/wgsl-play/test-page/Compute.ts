import type { WgslPlay } from "../src/index.ts";
import { expose } from "./Shared.ts";

const squaresPlayer = document.querySelector<WgslPlay>("#squaresPlayer")!;
const prefixSumPlayer = document.querySelector<WgslPlay>("#prefixSumPlayer")!;
const particlesPlayer = document.querySelector<WgslPlay>("#particlesPlayer")!;
const sliderPlayer = document.querySelector<WgslPlay>("#sliderPlayer")!;

const rejectedTwoComputePlayer = document.querySelector<WgslPlay>(
  "#rejectedTwoComputePlayer",
)!;
const rejectedMixedPlayer = document.querySelector<WgslPlay>(
  "#rejectedMixedPlayer",
)!;
const runtimeArrayPlayer = document.querySelector<WgslPlay>(
  "#runtimeArrayPlayer",
)!;
const rejectedMatrixPlayer = document.querySelector<WgslPlay>(
  "#rejectedMatrixPlayer",
)!;

for (const [el, label] of [
  [rejectedTwoComputePlayer, "two-compute"],
  [rejectedMixedPlayer, "mixed"],
  [rejectedMatrixPlayer, "matrix"],
] as const) {
  const status = document.querySelector<HTMLPreElement>(`#${el.id}-status`)!;
  el.addEventListener("compile-error", e => {
    const detail = (e as CustomEvent).detail as { message: string };
    status.textContent = `Status: rejected (${label}) - ${detail.message}`;
    status.dataset.rejected = "true";
  });
}

expose({
  squaresPlayer,
  prefixSumPlayer,
  particlesPlayer,
  sliderPlayer,
  rejectedTwoComputePlayer,
  rejectedMixedPlayer,
  runtimeArrayPlayer,
  rejectedMatrixPlayer,
});
