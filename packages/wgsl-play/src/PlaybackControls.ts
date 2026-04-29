import backToStartSvg from "./icons/backToStart.svg?raw";
import expandSvg from "./icons/expand.svg?raw";
import pauseSvg from "./icons/pause.svg?raw";
import playSvg from "./icons/play.svg?raw";
import refreshSvg from "./icons/refresh.svg?raw";
import shrinkSvg from "./icons/shrink.svg?raw";

export type ControlsMode = "render" | "compute";

/** Playback controls overlay for wgsl-play.
 *
 *  In "render" mode (default): play/pause + rewind + fullscreen.
 *  In "compute" mode: refresh (re-dispatch) + fullscreen — play/pause and
 *  rewind are hidden because compute mode is not animation-driven. */
export class PlaybackControls {
  private container: HTMLDivElement;
  private playPauseBtn: HTMLButtonElement;
  private rewindBtn: HTMLButtonElement;
  private refreshBtn: HTMLButtonElement;
  private fullscreenBtn: HTMLButtonElement;
  private playing = true;

  constructor(
    shadow: ShadowRoot,
    onPlay: () => void,
    onPause: () => void,
    onRewind: () => void,
    onFullscreen: () => void,
    onRefresh: () => void,
  ) {
    this.container = document.createElement("div");
    this.container.className = "controls";

    this.fullscreenBtn = makeBtn(expandSvg, onFullscreen);
    this.rewindBtn = makeBtn(backToStartSvg, onRewind);
    this.playPauseBtn = makeBtn(pauseSvg, () =>
      this.playing ? onPause() : onPlay(),
    );
    this.refreshBtn = makeBtn(refreshSvg, onRefresh);
    this.refreshBtn.hidden = true;

    this.container.append(
      this.fullscreenBtn,
      this.rewindBtn,
      this.playPauseBtn,
      this.refreshBtn,
    );
    shadow.appendChild(this.container);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.playPauseBtn.innerHTML = playing ? pauseSvg : playSvg;
  }

  setFullscreen(isFullscreen: boolean): void {
    this.fullscreenBtn.innerHTML = isFullscreen ? shrinkSvg : expandSvg;
  }

  setMode(mode: ControlsMode): void {
    const isCompute = mode === "compute";
    this.rewindBtn.hidden = isCompute;
    this.playPauseBtn.hidden = isCompute;
    this.refreshBtn.hidden = !isCompute;
  }

  show(): void {
    this.container.style.display = "";
  }

  hide(): void {
    this.container.style.display = "none";
  }
}

function makeBtn(html: string, handler: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.innerHTML = html;
  btn.addEventListener("click", handler);
  return btn;
}
