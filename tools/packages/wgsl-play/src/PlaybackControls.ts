import backToStartSvg from "./icons/backToStart.svg?raw";
import expandSvg from "./icons/expand.svg?raw";
import pauseSvg from "./icons/pause.svg?raw";
import playSvg from "./icons/play.svg?raw";
import shrinkSvg from "./icons/shrink.svg?raw";

/** Playback controls overlay for wgsl-play. */
export class PlaybackControls {
  private container: HTMLDivElement;
  private playPauseBtn: HTMLButtonElement;
  private fullscreenBtn: HTMLButtonElement;
  private playing = true;

  constructor(
    shadow: ShadowRoot,
    onPlay: () => void,
    onPause: () => void,
    onRewind: () => void,
    onFullscreen: () => void,
  ) {
    this.container = document.createElement("div");
    this.container.className = "controls";

    this.fullscreenBtn = document.createElement("button");
    this.fullscreenBtn.innerHTML = expandSvg;
    this.fullscreenBtn.addEventListener("click", onFullscreen);

    const rewindBtn = document.createElement("button");
    rewindBtn.innerHTML = backToStartSvg;
    rewindBtn.addEventListener("click", onRewind);

    this.playPauseBtn = document.createElement("button");
    this.playPauseBtn.innerHTML = pauseSvg;
    this.playPauseBtn.addEventListener("click", () =>
      this.playing ? onPause() : onPlay(),
    );

    this.container.append(this.fullscreenBtn, rewindBtn, this.playPauseBtn);
    shadow.appendChild(this.container);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.playPauseBtn.innerHTML = playing ? pauseSvg : playSvg;
  }

  setFullscreen(isFullscreen: boolean): void {
    this.fullscreenBtn.innerHTML = isFullscreen ? shrinkSvg : expandSvg;
  }

  show(): void {
    this.container.style.display = "";
  }

  hide(): void {
    this.container.style.display = "none";
  }
}
