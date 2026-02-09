import type { LinkParams, WeslBundle } from "wesl";
import { fileToModulePath, WeslParseError } from "wesl";
import { fetchDependencies, loadShaderFromUrl } from "wesl-fetch";
import type { WgslPlayConfig } from "./Config.ts";
import { ErrorOverlay } from "./ErrorOverlay.ts";
import { PlaybackControls } from "./PlaybackControls.ts";
import {
  createPipeline,
  initWebGPU,
  type LinkOptions,
  type PlaybackState,
  type RenderState,
  startRenderLoop,
} from "./Renderer.ts";
import cssText from "./WgslPlay.css?inline";

export { defaults, getConfig, resetConfig } from "./Config.ts";

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

/** One source location within a compile error. */
export interface CompileErrorLocation {
  file?: string;
  line: number;
  column: number; // 0-indexed
  length?: number;
  severity: "error" | "warning" | "info";
  message: string;
}

/** Compile error detail for events. */
export interface CompileErrorDetail {
  message: string;
  source: "wesl" | "webgpu";
  locations: CompileErrorLocation[];
}

// Lazy-init for SSR/Node.js compatibility (avoid browser APIs at module load)
let styles: CSSStyleSheet | null = null;
let template: HTMLTemplateElement | null = null;

/** <wgsl-play> web component for rendering WESL/WGSL fragment shaders.  */
export class WgslPlay extends HTMLElement {
  static observedAttributes = [
    "src",
    "shader-root",
    "source",
    "no-controls",
    "theme",
  ];

  private canvas: HTMLCanvasElement;
  private errorOverlay: ErrorOverlay;
  private controls: PlaybackControls;
  private resizeObserver: ResizeObserver;
  private stopRenderLoop?: () => void;

  private renderState?: RenderState;
  private playback: PlaybackState = {
    isPlaying: true,
    startTime: performance.now(),
    pausedDuration: 0,
  };

  private _weslSrc: Record<string, string> = {};
  private _rootModuleName = "package::main";
  private _libs?: WeslBundle[];
  private _linkOptions: LinkOptions = {};
  private _fromFullProject = false;
  private _initPromise?: Promise<boolean>;
  private _sourceEl: HTMLElement | null = null;
  private _sourceListener: ((e: Event) => void) | null = null;
  private _theme: "light" | "dark" | "auto" = "auto";
  private _mediaQuery: MediaQueryList | null = null;
  private _onFullscreenChange = () =>
    this.controls.setFullscreen(!!document.fullscreenElement);

  /** Get config overrides from element attributes. */
  private getConfigOverrides(): Partial<WgslPlayConfig> | undefined {
    const shaderRoot = this.getAttribute("shader-root");
    if (!shaderRoot) return undefined;
    return { shaderRoot };
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [getStyles()];
    shadow.appendChild(getTemplate().content.cloneNode(true));

    this.canvas = shadow.querySelector("canvas")!;
    this.errorOverlay = new ErrorOverlay(shadow);
    this.controls = new PlaybackControls(
      shadow,
      () => this.play(),
      () => this.pause(),
      () => this.rewind(),
      () => this.toggleFullscreen(),
    );

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
    const themeAttr = this.getAttribute("theme") as typeof this._theme | null;
    if (themeAttr) this._theme = themeAttr;
    this._mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    this._mediaQuery.addEventListener("change", () => this.updateTheme());
    this.updateTheme();
    document.addEventListener("fullscreenchange", this._onFullscreenChange);
    this.initialize();
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    this.stopRenderLoop?.();
    document.removeEventListener("fullscreenchange", this._onFullscreenChange);
    if (this._sourceEl && this._sourceListener) {
      this._sourceEl.removeEventListener("change", this._sourceListener);
    }
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === "no-controls") {
      newValue !== null ? this.controls.hide() : this.controls.show();
      return;
    }

    if (name === "theme") {
      this._theme = (newValue as typeof this._theme) || "auto";
      this.updateTheme();
      return;
    }

    // Initial src is handled by initialize(); this handles later changes
    if (name === "src" && newValue && this._initPromise) {
      this.loadFromUrl(newValue);
    }
  }

  /** Current shader source code (main module). */
  get source(): string {
    return this._weslSrc[this._rootModuleName] ?? "";
  }

  /** Set shader source directly. */
  set source(value: string) {
    this._weslSrc = { [this._rootModuleName]: value };
    this._libs = undefined;
    this._fromFullProject = false;
    this.discoverAndRebuild();
  }

  /** Set project configuration (mirrors wesl link() API). */
  set project(value: WeslProject) {
    const {
      weslSrc,
      rootModuleName,
      libs,
      packageName,
      conditions,
      constants,
    } = value;

    // Update link options if provided
    if (packageName || conditions || constants) {
      this._linkOptions = { packageName, conditions, constants };
    }
    if (libs) this._libs = libs;

    if (weslSrc) {
      this.setProjectSources(weslSrc, rootModuleName);
      return;
    }

    // Partial update - may need to refetch if conditions changed
    if (Object.keys(this._weslSrc).length === 0) return;
    if (this._fromFullProject) this.rebuildPipeline();
    else this.discoverAndRebuild();
  }

  /** Set sources from a full project with weslSrc. */
  private setProjectSources(
    weslSrc: Record<string, string>,
    rootModuleName?: string,
  ): void {
    // Convert file paths to module paths if needed (for ?link imports)
    const entries = Object.entries(weslSrc).map(([k, v]) => [
      toModulePath(k),
      v,
    ]);
    this._weslSrc = Object.fromEntries(entries);
    this._rootModuleName = rootModuleName
      ? toModulePath(rootModuleName)
      : "package::main";
    this._fromFullProject = true;
    this.discoverAndRebuild();
  }

  /** Whether the shader is currently playing. */
  get isPlaying(): boolean {
    return this.playback.isPlaying;
  }

  /** Current animation time in seconds. */
  get time(): number {
    const { isPlaying, startTime, pausedDuration } = this.playback;
    const now = isPlaying ? performance.now() : startTime + pausedDuration;
    return (now - startTime) / 1000;
  }

  /** Number of frames rendered (for testing/debugging). */
  get frameCount(): number {
    return this.renderState?.frameCount ?? 0;
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
    const { isPlaying, pausedDuration } = this.playback;
    if (isPlaying) return;
    this.playback.startTime = performance.now() - pausedDuration;
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
    this.controls.setPlaying(playing);
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
    if (!message) {
      this.errorOverlay.hide();
      return;
    }
    this.errorOverlay.show(message);
    this.pause();
  }

  /** Toggle fullscreen on this element. */
  toggleFullscreen(): void {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.requestFullscreen();
  }

  private updateTheme(): void {
    const isDark =
      this._theme === "dark" ||
      (this._theme === "auto" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    this.classList.toggle("dark", isDark);
  }

  /** Set up WebGPU and load initial shader. Returns true if successful. */
  private initialize(): Promise<boolean> {
    if (!this._initPromise) this._initPromise = this.doInitialize();
    return this._initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    try {
      this.renderState = await initWebGPU(this.canvas);
      await this.loadInitialContent();
      this.stopRenderLoop = startRenderLoop(this.renderState, this.playback);
      this.dispatchEvent(new CustomEvent("ready"));
      return true;
    } catch (error) {
      const message = !navigator.gpu
        ? "WebGPU is not supported in this browser.\nTry Chrome 113+, Edge 113+, or Safari 18+."
        : `WebGPU initialization failed: ${error}`;
      this.errorOverlay.show(message);
      this.pause();
      this.dispatchEvent(
        new CustomEvent("init-error", { detail: { message } }),
      );
      return false;
    }
  }

  /** Load from source element, src URL, script child, or inline textContent. */
  private async loadInitialContent(): Promise<void> {
    const sourceId = this.getAttribute("source");
    if (sourceId) return this.connectToSource(sourceId);

    const src = this.getAttribute("src");
    if (src) return this.loadFromUrl(src);

    // Prefer <script type="text/wgsl"> or <script type="text/wesl"> (no HTML escaping needed)
    const script = this.querySelector(
      'script[type="text/wgsl"], script[type="text/wesl"]',
    );
    const inlineSource =
      script?.textContent?.trim() ?? this.textContent?.trim();
    if (!inlineSource) return;

    this._weslSrc = { [this._rootModuleName]: inlineSource };
    this._fromFullProject = false;
    await this.discoverAndRebuild();
  }

  /** Connect to a source provider element (e.g., wgsl-edit). */
  private async connectToSource(id: string): Promise<void> {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`wgsl-play: source element "${id}" not found`);
      return;
    }
    this._sourceEl = el;

    // Get sources from element - support both single-file and multi-file APIs
    const getSources = (): Record<string, string> => {
      const sources = (el as any).sources;
      if (sources && Object.keys(sources).length > 0) return sources;
      const source = (el as any).source ?? el.textContent ?? "";
      return { [this._rootModuleName]: source };
    };

    // Load initial sources
    this.project = { weslSrc: getSources() };

    // Listen for changes - handle both single and multi-file
    this._sourceListener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const fallback = { [this._rootModuleName]: detail?.source ?? "" };
      this.project = { weslSrc: detail?.sources ?? fallback };
    };
    el.addEventListener("change", this._sourceListener);
  }

  /** Fetch shader from URL, auto-fetching any imported dependencies. */
  private async loadFromUrl(url: string): Promise<void> {
    if (!this.renderState) return;

    try {
      this.errorOverlay.hide();
      const { weslSrc, libs, rootModuleName } = await loadShaderFromUrl(
        url,
        this.getConfigOverrides()?.shaderRoot,
      );
      this._weslSrc = weslSrc;
      this._libs = libs;
      this._fromFullProject = false;
      if (rootModuleName) this._rootModuleName = rootModuleName;

      const mainSource = weslSrc[this._rootModuleName];
      if (!mainSource) return;

      await createPipeline(this.renderState, mainSource, {
        ...this._linkOptions,
        weslSrc,
        libs,
        rootModuleName: this._rootModuleName,
      });
      this.dispatchEvent(new CustomEvent("compile-success"));
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  /** Rebuild GPU pipeline using stored state. For full projects with all sources. */
  private async rebuildPipeline(): Promise<void> {
    if (!(await this.initialize())) return;

    const mainSource = this._weslSrc[this._rootModuleName];
    if (!mainSource) return;

    try {
      this.errorOverlay.hide();
      await createPipeline(this.renderState!, mainSource, {
        ...this._linkOptions,
        weslSrc: this._weslSrc,
        libs: this._libs,
        rootModuleName: this._rootModuleName,
      });
      this.dispatchEvent(new CustomEvent("compile-success"));
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  /** Discover dependencies and rebuild. For HTTP/inline sources that may need fetching. */
  private async discoverAndRebuild(): Promise<void> {
    if (!(await this.initialize())) return;

    const mainSource = this._weslSrc[this._rootModuleName];
    if (!mainSource) return;

    try {
      this.errorOverlay.hide();
      const { weslSrc, libs } = await fetchDependencies(mainSource, {
        shaderRoot: this.getConfigOverrides()?.shaderRoot,
        existingSources: this._weslSrc,
      });
      this._weslSrc = { ...this._weslSrc, ...weslSrc };
      this._libs = [...(this._libs ?? []), ...libs];

      await createPipeline(this.renderState!, mainSource, {
        ...this._linkOptions,
        weslSrc: this._weslSrc,
        libs: this._libs,
        rootModuleName: this._rootModuleName,
      });
      this.dispatchEvent(new CustomEvent("compile-success"));
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  private handleCompileError(error: unknown): void {
    const message = (error as any)?.message ?? String(error);
    this.errorOverlay.show(message);

    const source = error instanceof WeslParseError ? "wesl" : "webgpu";
    const locations = this.extractLocations(error);
    const detail: CompileErrorDetail = { message, source, locations };
    this.dispatchEvent(new CustomEvent("compile-error", { detail }));
  }

  /** Extract source locations from a WESL parse error or GPU compilation error. */
  private extractLocations(error: unknown): CompileErrorLocation[] {
    // WESL linker errors attach a single weslLocation
    const loc = (error as any)?.weslLocation;
    if (loc) {
      return [
        {
          file: loc.file,
          line: loc.line,
          column: loc.column - 1,
          length: loc.length,
          severity: "error",
          message: (error as any)?.message ?? "",
        },
      ];
    }
    // GPU compilation errors have multiple messages
    const msgs = (error as any)?.compilationInfo?.messages;
    if (msgs) {
      return msgs.map((m: any) => ({
        file: m.module?.url,
        line: m.lineNum,
        column: m.linePos - 1, // 1-indexed to 0-indexed
        length: m.length,
        severity:
          m.type === "warning"
            ? "warning"
            : m.type === "info"
              ? "info"
              : "error",
        message: m.message,
      }));
    }
    return [];
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

/** Convert file path to module path (e.g., "effects/main.wesl" -> "package::effects::main"). */
function toModulePath(filePath: string): string {
  return fileToModulePath(filePath, "package", false);
}
