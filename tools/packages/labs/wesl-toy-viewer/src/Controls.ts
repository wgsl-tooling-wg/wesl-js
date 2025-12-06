import type { WgslPlay } from "wgsl-play";
import type { LoadedAppState } from "./AppState.ts";
import { loadNewPackage, selectPackage } from "./PackageControl.ts";
import { loadAndCompileShader, loadShaderFromUrl } from "./ShaderLoader.ts";

/** Get the wgsl-play element from the page. */
export function getPlayer(): WgslPlay {
  const player = document.querySelector<WgslPlay>("#player");
  if (!player) throw new Error("wgsl-play element not found");
  return player;
}

/** Set up UI event handlers for shader selection and playback controls. */
export function setupControls(state: LoadedAppState): void {
  const elements = getRequiredElements();
  setupPackageControls(state, elements);
  setupShaderControls(state, elements);
  setupPlaybackControls(state, elements);
}

interface ControlElements {
  packageSelect: HTMLSelectElement;
  packageInput: HTMLInputElement;
  shaderSelect: HTMLSelectElement;
  customUrl: HTMLInputElement;
  playPauseBtn: HTMLButtonElement;
  rewindBtn: HTMLButtonElement;
}

/** Query DOM for all required UI control elements. */
function getRequiredElements(): ControlElements {
  const packageSelect =
    document.querySelector<HTMLSelectElement>("#package-select");
  const packageInput =
    document.querySelector<HTMLInputElement>("#package-input");
  const shaderSelect =
    document.querySelector<HTMLSelectElement>("#shader-select");
  const customUrl = document.querySelector<HTMLInputElement>("#custom-url");
  const playPauseBtn = document.querySelector<HTMLButtonElement>("#play-pause");
  const rewindBtn = document.querySelector<HTMLButtonElement>("#rewind");

  if (
    !packageSelect ||
    !packageInput ||
    !shaderSelect ||
    !customUrl ||
    !playPauseBtn ||
    !rewindBtn
  ) {
    throw new Error("UI elements not found");
  }

  return {
    packageSelect,
    packageInput,
    shaderSelect,
    customUrl,
    playPauseBtn,
    rewindBtn,
  };
}

/** Attach event handlers for package dropdown and input field. */
function setupPackageControls(
  state: LoadedAppState,
  elements: ControlElements,
): void {
  elements.packageSelect.addEventListener("change", async () => {
    elements.packageInput.value = "";
    await selectPackage(state, elements.packageSelect.value);
  });

  elements.packageInput.addEventListener("change", async () => {
    if (elements.packageInput.value.trim()) {
      await loadNewPackage(state, elements.packageInput.value);
      elements.packageInput.value = "";
    }
  });
}

/** Attach event handlers for shader dropdown and custom URL input. */
function setupShaderControls(
  state: LoadedAppState,
  elements: ControlElements,
): void {
  elements.shaderSelect.addEventListener("change", async () => {
    elements.customUrl.value = "";
    await loadAndCompileShader(state, elements.shaderSelect.value);
  });

  elements.customUrl.addEventListener("change", async () => {
    if (elements.customUrl.value.trim()) {
      elements.shaderSelect.value = "";
      await loadShaderFromUrl(state, elements.customUrl.value);
    }
  });
}

/** Attach event handlers for play/pause and rewind buttons. */
function setupPlaybackControls(
  _state: LoadedAppState,
  elements: ControlElements,
): void {
  const player = getPlayer();

  elements.playPauseBtn.addEventListener("click", () => {
    if (player.isPlaying) {
      player.pause();
      elements.playPauseBtn.textContent = "Play";
    } else {
      player.play();
      elements.playPauseBtn.textContent = "Pause";
    }
  });

  elements.rewindBtn.addEventListener("click", () => {
    player.rewind();
  });
}
