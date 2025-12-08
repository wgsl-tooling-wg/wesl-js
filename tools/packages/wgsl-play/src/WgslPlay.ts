import type { LinkParams, WeslBundle } from "wesl";
import { ErrorOverlay } from "./ErrorOverlay.ts";
import {
  fetchDependenciesForSource,
  loadShaderFromUrl,
} from "./PackageLoader.ts";
import {
  createPipeline,
  initWebGPU,
  type LinkOptions,
  type PlaybackState,
  type RenderState,
  startRenderLoop,
} from "./Renderer.ts";
import cssText from "./WgslPlay.css?inline";

/** Project configuration for multi-file shaders (subset of wesl link() API). */
export type WeslProject = Pick<
  LinkParams,
  | "weslSrc"
  | "rootModuleName"
  | "conditions"
  | "constants"
  | "libs"
  | "packageName"
>;

/** Compile error detail for events. */
export interface CompileErrorDetail {
  message: string;
}

// Lazy-init for SSR/Node.js compatibility (avoid browser APIs at module load)
let styles: CSSStyleSheet | null = null;
let template: HTMLTemplateElement | null = null;

/**
 * <wgsl-play> - Web component for rendering WESL/WGSL fragment shaders.
 *
 * @example
 * <!-- From URL -->
 * <wgsl-play src="./shader.wesl"></wgsl-play>
 *
 * <!-- Inline source -->
 * <wgsl-play>
 *   @fragment fn fs_main() -> @location(0) vec4f {
 *     return vec4f(1.0, 0.0, 0.0, 1.0);
 *   }
 * </wgsl-play>
 */
export class WgslPlay extends HTMLElement {
  static observedAttributes = ["src"];

  private canvas: HTMLCanvasElement;
  private errorOverlay: ErrorOverlay;
  private resizeObserver: ResizeObserver;
  private stopRenderLoop?: () => void;

  private renderState?: RenderState;
  private playback: PlaybackState = {
    isPlaying: true,
    startTime: performance.now(),
    pausedDuration: 0,
  };

  private _source = "";
  private _linkOptions: LinkOptions = {};
  private _initialized = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [getStyles()];
    shadow.appendChild(getTemplate().content.cloneNode(true));

    this.canvas = shadow.querySelector("canvas")!;
    this.errorOverlay = new ErrorOverlay(shadow, () => this.pause());

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.canvas.width = Math.floor(width * devicePixelRatio);
          this.canvas.height = Math.floor(height * devicePixelRatio);
        }
      }
    });
  }

  connectedCallback(): void {
    this.resizeObserver.observe(this);
    this.initialize();
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    this.stopRenderLoop?.();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    // Initial src is handled by initialize(); this handles later changes
    if (name === "src" && newValue && this._initialized) {
      this.loadFromUrl(newValue);
    }
  }

  /** Current shader source code. */
  get source(): string {
    return this._source;
  }

  /** Set shader source directly. */
  set source(value: string) {
    this._source = value;
    this.compileSource(value);
  }

  /** Set project configuration (mirrors wesl link() API). */
  set project(value: WeslProject) {
    const { weslSrc, rootModuleName, libs } = value;
    const { packageName, conditions, constants } = value;
    if (!weslSrc || !rootModuleName) return;
    const mainSource = weslSrc[rootModuleName];
    if (!mainSource) return;

    this._source = mainSource;
    this._linkOptions = { packageName, conditions, constants };

    if (libs?.length) {
      this.compileWithLibs(mainSource, libs);
    } else {
      this.compileSource(mainSource);
    }
  }

  /** Whether the shader is currently playing. */
  get isPlaying(): boolean {
    return this.playback.isPlaying;
  }

  /** Current animation time in seconds. */
  get time(): number {
    const currentTime = this.playback.isPlaying
      ? performance.now()
      : this.playback.startTime + this.playback.pausedDuration;
    return (currentTime - this.playback.startTime) / 1000;
  }

  /** Whether there's a compilation error. */
  get hasError(): boolean {
    return this.errorOverlay.visible;
  }

  /** Current error message, or null if no error. */
  get errorMessage(): string | null {
    return this.errorOverlay.message;
  }

  /** Start playback. */
  play(): void {
    if (this.playback.isPlaying) return;
    const pauseTime = this.playback.startTime + this.playback.pausedDuration;
    this.playback.startTime =
      performance.now() - (pauseTime - this.playback.startTime);
    this.setPlaying(true);
  }

  /** Pause playback. */
  pause(): void {
    if (!this.playback.isPlaying) return;
    this.playback.pausedDuration = performance.now() - this.playback.startTime;
    this.setPlaying(false);
  }

  private setPlaying(playing: boolean): void {
    this.playback.isPlaying = playing;
    this.dispatchEvent(
      new CustomEvent("playback-change", { detail: { isPlaying: playing } }),
    );
  }

  /** Reset animation to time 0 and pause. */
  rewind(): void {
    this.playback.startTime = performance.now();
    this.playback.pausedDuration = 0;
    this.setPlaying(false);
  }

  /** Display error message in overlay. Pass empty string to clear. */
  showError(message: string): void {
    if (message) {
      this.errorOverlay.show(message);
      this.pause();
    } else {
      this.errorOverlay.hide();
    }
  }

  /** Set up WebGPU and load initial shader from src attribute or inline content. */
  private async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    try {
      this.renderState = await initWebGPU(this.canvas);
      await this.loadInitialContent();
      this.stopRenderLoop = startRenderLoop(this.renderState, this.playback);
    } catch (error) {
      const message = `WebGPU initialization failed: ${error}`;
      this.errorOverlay.show(message);
      this.pause();
      this.dispatchEvent(
        new CustomEvent("init-error", { detail: { message } }),
      );
    }
  }

  /** Load from src attribute or inline textContent. */
  private async loadInitialContent(): Promise<void> {
    const src = this.getAttribute("src");
    if (src) {
      await this.loadFromUrl(src);
    } else {
      const inlineSource = this.textContent?.trim();
      if (inlineSource) await this.compileSource(inlineSource);
    }
  }

  /** Fetch shader from URL, auto-fetching any imported dependencies. */
  private async loadFromUrl(url: string): Promise<void> {
    if (!this.renderState) return;

    try {
      this.errorOverlay.hide();
      const { source, bundles } = await loadShaderFromUrl(url);
      this._source = source;
      await createPipeline(this.renderState, source, bundles);
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  /** Compile source string, auto-fetching any imported dependencies. */
  private async compileSource(source: string): Promise<void> {
    if (!this.renderState) return;

    try {
      this.errorOverlay.hide();
      const bundles = await fetchDependenciesForSource(source);
      await createPipeline(
        this.renderState,
        source,
        bundles,
        this._linkOptions,
      );
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  /** Compile with pre-loaded library bundles (no network fetch for libs). */
  private async compileWithLibs(
    source: string,
    libs: WeslBundle[],
  ): Promise<void> {
    if (!this.renderState) {
      await this.initialize();
    }
    if (!this.renderState) return;

    try {
      this.errorOverlay.hide();
      await createPipeline(this.renderState, source, libs, this._linkOptions);
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  private handleCompileError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.errorOverlay.show(message);
    this.pause();
    const detail: CompileErrorDetail = { message };
    this.dispatchEvent(new CustomEvent("compile-error", { detail }));
  }
}

function getTemplate(): HTMLTemplateElement {
  if (!template) {
    template = document.createElement("template");
    template.innerHTML = `<canvas part="canvas"></canvas>`;
  }
  return template;
}

function getStyles(): CSSStyleSheet {
  if (!styles) {
    styles = new CSSStyleSheet();
    styles.replaceSync(cssText);
  }
  return styles;
}
