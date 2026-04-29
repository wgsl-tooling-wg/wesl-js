import type { Conditions, WeslBundle, WeslProject } from "wesl";
import { fileToModulePath, WeslParseError } from "wesl";
import { fetchDependencies, loadShaderFromUrl } from "wesl-fetch";
import { type ResolveUserTexture, ResourceLoadError } from "wesl-gpu";
import { clampCanvas, entrySize } from "./CanvasSize.ts";
import { rerunCompute } from "./ComputeBuild.ts";
import type { WgslPlayConfig } from "./Config.ts";
import { ErrorOverlay } from "./ErrorOverlay.ts";
import {
  calculateTime,
  type PlaybackState,
  renderOnce,
  startRenderLoop,
} from "./FragmentRender.ts";
import { PlaybackControls } from "./PlaybackControls.ts";
import {
  type BuildResult,
  createPipeline,
  initWebGPU,
  type LinkOptions,
  type RenderState,
} from "./Renderer.ts";
import { disposeResources } from "./RenderResources.ts";
import { renderResultsPanel } from "./ResultsPanel.ts";
import { UniformControls } from "./UniformControls.ts";
import cssText from "./WgslPlay.css?inline";

export { defaults, getConfig, resetConfig } from "./Config.ts";

/** One source location within a compile error. */
export interface CompileErrorLocation {
  file?: string;
  line: number;
  column: number; // 0-indexed
  length?: number;
  /** byte offset into the source file */
  offset: number;
  severity: "error" | "warning" | "info";
  message: string;
}

/** Compile error detail for events. */
export interface CompileErrorDetail {
  message: string;
  source: "wesl" | "webgpu";
  /** What kind of failure: a shader compile/link problem or a host-side resource problem. */
  kind: "shader" | "resource";
  /** For resource errors, the `@texture(name)` or buffer var referenced. */
  resourceSource?: string;
  locations: CompileErrorLocation[];
}

export { ResourceLoadError } from "wesl-gpu";

// Lazy-init for SSR/Node.js compatibility (avoid browser APIs at module load)
let styles: CSSStyleSheet | null = null;
let template: HTMLTemplateElement | null = null;

/** <wgsl-play> web component for rendering WESL/WGSL fragment shaders.  */
export class WgslPlay extends HTMLElement {
  static observedAttributes = [
    "src",
    "shader-root",
    "from",
    "no-controls",
    "no-settings",
    "theme",
    "autoplay",
    "transparent",
    "fetch-libs",
    "fetch-sources",
    "width",
    "height",
    "pixel-ratio",
  ];

  private canvas: HTMLCanvasElement;
  private resultsPanel: HTMLElement;
  private errorOverlay: ErrorOverlay;
  private controls: PlaybackControls;
  private settings: UniformControls;
  private resizeObserver: ResizeObserver;
  private stopRenderLoop?: () => void;
  private _currentMode: "fragment" | "compute" = "fragment";
  private _rerunPending = false;

  private renderState?: RenderState;
  private pendingUniforms = new Map<string, number | number[]>();
  private playback: PlaybackState = {
    isPlaying: true,
    startTime: performance.now(),
    pausedDuration: 0,
  };

  private _weslSrc: Record<string, string> = {};
  private _rootModuleName = "package::main";
  private _libs?: WeslBundle[];
  private _linkOptions: LinkOptions = {};
  private _fetchSources = true;
  private _initPromise?: Promise<boolean>;
  private _sourceEl: HTMLElement | null = null;
  private _sourceListener: ((e: Event) => void) | null = null;
  private _fetchLibs = true;
  private _dirty = false;
  private _building = false;
  private _theme: "light" | "dark" | "auto" = "auto";
  private _mediaQuery: MediaQueryList | null = null;
  private _onFullscreenChange = () =>
    this.controls.setFullscreen(!!document.fullscreenElement);
  private _pointerCleanup?: () => void;
  private _resizeCleanup?: () => void;
  private _childObserver?: MutationObserver;

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
    this.resultsPanel = shadow.querySelector(".results-panel") as HTMLElement;
    this.errorOverlay = new ErrorOverlay(shadow);
    this.settings = new UniformControls(shadow, (name, value) => {
      this.setUniform(name, value);
      if (this._currentMode === "compute") this.scheduleComputeRerun();
    });
    this.controls = new PlaybackControls(
      shadow,
      () => this.play(),
      () => this.pause(),
      () => this.rewind(),
      () => this.toggleFullscreen(),
      () => this.scheduleComputeRerun(),
    );

    this.resizeObserver = new ResizeObserver(entries => {
      if (!this.renderState) return;
      if (this.hasAttribute("width") && this.hasAttribute("height")) return;
      const entry = entries.at(-1);
      if (!entry) return;
      const [width, height] = entrySize(
        entry,
        this.getAttribute("pixel-ratio"),
      );
      if (width > 0 && height > 0) {
        const maxDim = this.renderState.device.limits.maxTextureDimension2D;
        this.canvas.width = clampCanvas(width, maxDim);
        this.canvas.height = clampCanvas(height, maxDim);
      }
    });

    this.setupResizeHandle(shadow.querySelector(".resize-handle")!);
  }

  connectedCallback(): void {
    const themeAttr = this.getAttribute("theme") as typeof this._theme | null;
    if (themeAttr) this._theme = themeAttr;
    this._mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    this._mediaQuery.addEventListener("change", () => this.updateTheme());
    this.updateTheme();
    document.addEventListener("fullscreenchange", this._onFullscreenChange);
    if (!this.autoplay) {
      this.playback.isPlaying = false;
      this.controls.setPlaying(false);
    }
    this.initialize();
    this.observeLightDomChildren();
    upgradeProperty(this, "conditions");
    upgradeProperty(this, "shader");
    upgradeProperty(this, "project");
  }

  /** Start watching element size. Deferred until after `initWebGPU` so the
   *  observer has a real `maxTextureDimension2D` to clamp against */
  private observeCanvasSize(): void {
    try {
      this.resizeObserver.observe(this, { box: "device-pixel-content-box" });
    } catch {
      this.resizeObserver.observe(this);
    }
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    this._childObserver?.disconnect();
    this._childObserver = undefined;
    this.stopRenderLoop?.();
    this._pointerCleanup?.();
    this._resizeCleanup?.();
    document.removeEventListener("fullscreenchange", this._onFullscreenChange);
    if (this._sourceEl && this._sourceListener) {
      this._sourceEl.removeEventListener("change", this._sourceListener);
    }
    if (this.renderState) disposeResources(this.renderState);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case "no-controls":
        newValue !== null ? this.controls.hide() : this.controls.show();
        return;
      case "no-settings":
        newValue !== null ? this.settings.hide() : this.settings.show();
        return;
      case "theme":
        this._theme = (newValue as typeof this._theme) || "auto";
        this.updateTheme();
        return;
      case "autoplay":
        newValue === "false" ? this.pause() : this.play();
        return;
      case "fetch-libs":
        this._fetchLibs = newValue !== "false";
        return;
      case "fetch-sources":
        this._fetchSources = newValue !== "false";
        return;
      case "src":
        if (newValue && this._initPromise) this.loadFromUrl(newValue);
        return;
      case "width":
      case "height":
        this.updateCanvasSize();
        return;
      case "pixel-ratio":
        this.updateCanvasSize();
        return;
    }
  }

  /** Current shader source code (main module). */
  get shader(): string {
    return this._weslSrc[this._rootModuleName] ?? "";
  }

  /** Set shader source directly (single-file convenience). */
  set shader(value: string) {
    this._weslSrc = { [this._rootModuleName]: value };
    this._libs = undefined;
    this.requestBuild();
  }

  /** Conditions for conditional compilation (@if/@elif/@else). */
  get conditions(): Conditions {
    return this._linkOptions.conditions ?? {};
  }

  set conditions(value: Conditions) {
    this._linkOptions = { ...this._linkOptions, conditions: value };
    if (Object.keys(this._weslSrc).length === 0) return;
    this.requestBuild();
  }

  /** Set project configuration (mirrors wesl link() API). */
  set project(value: WeslProject) {
    const { weslSrc, rootModuleName, libs } = value;
    const { packageName, conditions, constants } = value;
    if (packageName !== undefined) this._linkOptions.packageName = packageName;
    if (conditions !== undefined) this._linkOptions.conditions = conditions;
    if (constants !== undefined) this._linkOptions.constants = constants;
    if (libs) this._libs = libs;

    if (weslSrc) {
      const pkg = this._linkOptions.packageName || "package";
      const root = rootModuleName ?? "main";
      this._weslSrc = toModulePaths(weslSrc, pkg);
      this._rootModuleName = fileToModulePath(root, pkg, false);
      this.requestBuild();
      return;
    }

    if (Object.keys(this._weslSrc).length === 0) return;
    this.requestBuild();
  }

  /** Whether to auto-fetch missing library packages from npm (default: true). */
  get fetchLibs(): boolean {
    return this._fetchLibs;
  }

  set fetchLibs(value: boolean) {
    this._fetchLibs = value;
    if (value) this.removeAttribute("fetch-libs");
    else this.setAttribute("fetch-libs", "false");
  }

  /** Whether to fetch local .wesl source files via HTTP (default: true). */
  get fetchSources(): boolean {
    return this._fetchSources;
  }

  set fetchSources(value: boolean) {
    this._fetchSources = value;
    if (value) this.removeAttribute("fetch-sources");
    else this.setAttribute("fetch-sources", "false");
  }

  /** Whether autoplay is enabled (default: true). Set autoplay="false" to start paused. */
  get autoplay(): boolean {
    return this.getAttribute("autoplay") !== "false";
  }

  set autoplay(value: boolean | string) {
    const enabled = value !== false && value !== "false";
    if (enabled) this.removeAttribute("autoplay");
    else this.setAttribute("autoplay", "false");
  }

  /** Scale factor from CSS pixels to canvas pixels (default: devicePixelRatio). */
  get pixelRatio(): number {
    const attr = this.getAttribute("pixel-ratio");
    return attr !== null ? Number(attr) : devicePixelRatio;
  }

  set pixelRatio(value: number) {
    this.setAttribute("pixel-ratio", String(value));
  }

  /** Whether the shader is currently playing. */
  get isPlaying(): boolean {
    return this.playback.isPlaying;
  }

  /** Current animation time in seconds. */
  get time(): number {
    return calculateTime(this.playback);
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
    if (this.renderState) {
      this.stopRenderLoop = startRenderLoop(this.renderState, this.playback);
    }
  }

  /** Pause playback. */
  pause(): void {
    if (!this.playback.isPlaying) return;
    this.playback.pausedDuration = performance.now() - this.playback.startTime;
    this.stopRenderLoop?.();
    this.setPlaying(false);
    if (this.renderState) renderOnce(this.renderState, this.playback);
  }

  private setPlaying(playing: boolean): void {
    this.playback.isPlaying = playing;
    this.controls.setPlaying(playing);
    const detail = { isPlaying: playing };
    this.dispatchEvent(new CustomEvent("playback-change", { detail }));
  }

  /** Reset animation to time 0 and pause. */
  rewind(): void {
    this.playback.startTime = performance.now();
    this.playback.pausedDuration = 0;
    this.stopRenderLoop?.();
    this.setPlaying(false);
    if (this.renderState) renderOnce(this.renderState, this.playback);
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

  /** Set a uniform value by name. Works before or after compilation. */
  setUniform(name: string, value: number | number[]): void {
    this.pendingUniforms.set(name, value);
    this.renderState?.uniformState.controlValues.set(name, value);
    if (this.renderState && !this.playback.isPlaying)
      renderOnce(this.renderState, this.playback);
  }

  private flushPendingUniforms(): void {
    const map = this.renderState?.uniformState.controlValues;
    if (!map) return;
    for (const [k, v] of this.pendingUniforms) map.set(k, v);
  }

  /** Current uniform control values (readable). */
  get uniforms(): Record<string, number | number[]> {
    const map = this.renderState?.uniformState.controlValues;
    if (!map) return {};
    return Object.fromEntries(map);
  }

  /** Toggle fullscreen on this element. */
  toggleFullscreen(): void {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.requestFullscreen();
  }

  /** Track pointer events on canvas for mouse_pos @auto fields. */
  private setupMouseTracking(): void {
    const mouse = this.renderState!.mouse;
    const canvas = this.canvas;

    const onMove = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      mouse.delta = [x - mouse.pos[0], y - mouse.pos[1]];
      mouse.pos = [x, y];
    };
    const onDown = (e: PointerEvent): void => {
      mouse.button = e.button + 1; // 0=none, 1=left, 2=middle, 3=right
    };
    const onUp = (): void => {
      mouse.button = 0;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    this._pointerCleanup = () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }

  /** Drag-to-resize via a custom handle (works on touch + mouse). */
  private setupResizeHandle(handle: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onMove = (e: PointerEvent): void => {
      this.style.width = `${startW + e.clientX - startX}px`;
      this.style.height = `${startH + e.clientY - startY}px`;
    };
    const onUp = (): void => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    const onDown = (e: PointerEvent): void => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const rect = this.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startW = rect.width;
      startH = rect.height;
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    };

    handle.addEventListener("pointerdown", onDown);
    this._resizeCleanup = () => {
      handle.removeEventListener("pointerdown", onDown);
      onUp();
    };
  }

  /** Recompute canvas resolution from attributes or CSS size. */
  private updateCanvasSize(): void {
    const w = this.getAttribute("width");
    const h = this.getAttribute("height");
    const maxDim = this.renderState?.device.limits.maxTextureDimension2D;
    if (w !== null && h !== null) {
      this.canvas.width = clampCanvas(Number(w), maxDim);
      this.canvas.height = clampCanvas(Number(h), maxDim);
    } else {
      const rect = this.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const ratio = this.pixelRatio;
        this.canvas.width = clampCanvas(rect.width * ratio, maxDim);
        this.canvas.height = clampCanvas(rect.height * ratio, maxDim);
      }
    }
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
    if (this.renderState) return Promise.resolve(true);
    if (!this._initPromise) this._initPromise = this.doInitialize();
    return this._initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    try {
      const transparent = this.hasAttribute("transparent");
      const alphaMode = transparent ? "premultiplied" : "opaque";
      this.renderState = await initWebGPU(this.canvas, alphaMode);
      this.observeCanvasSize();
      this.setupMouseTracking();
      this.loadInitialContent();
      if (this.playback.isPlaying) {
        this.stopRenderLoop = startRenderLoop(this.renderState, this.playback);
      }
      this.dispatchEvent(new CustomEvent("ready"));
      return true;
    } catch (error) {
      const message = !navigator.gpu
        ? "WebGPU is not supported in this browser.\nTry Chrome 113+, Edge 113+, or Safari 18+."
        : `WebGPU initialization failed: ${error}`;
      this.errorOverlay.show(message);
      this.pause();
      const detail = { message };
      this.dispatchEvent(new CustomEvent("init-error", { detail }));
      return false;
    }
  }

  /** Load from source element, src URL, script child, or inline textContent. */
  private loadInitialContent(): void {
    const fromId = this.getAttribute("from");
    if (fromId) {
      this.connectFrom(fromId);
      return;
    }

    const src = this.getAttribute("src");
    if (src) {
      this.loadFromUrl(src);
      return;
    }

    // Prefer <script type="text/wgsl"> or <script type="text/wesl"> (no HTML escaping needed)
    const script = this.querySelector(
      'script[type="text/wgsl"], script[type="text/wesl"]',
    );
    const inlineSource =
      script?.textContent?.trim() ?? this.textContent?.trim();
    if (!inlineSource) return;

    this._weslSrc = { [this._rootModuleName]: inlineSource };
    this.requestBuild();
  }

  /** Connect to a source provider element (e.g., wgsl-edit). */
  private connectFrom(id: string): void {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`wgsl-play: source element "${id}" not found`);
      return;
    }
    this._sourceEl = el;

    // Tell the editor to use this player for lint feedback (disables its own GPU lint)
    if (this.id && !el.getAttribute("lint-from")) {
      el.setAttribute("lint-from", this.id);
    }

    const p = (el as any).project as WeslProject | undefined;
    if (p) this.project = p;

    this._sourceListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as WeslProject | undefined;
      if (detail) this.project = detail;
    };
    el.addEventListener("change", this._sourceListener);
  }

  /** Fetch shader from URL, then trigger a build. */
  private async loadFromUrl(url: string): Promise<void> {
    try {
      const shaderRoot = this.getConfigOverrides()?.shaderRoot;
      const { weslSrc, libs, rootModuleName } = await loadShaderFromUrl(
        url,
        shaderRoot,
      );
      this._weslSrc = weslSrc;
      this._libs = libs;
      if (rootModuleName) this._rootModuleName = rootModuleName;
      this.requestBuild();
    } catch (error) {
      this.handleCompileError(error);
    }
  }

  /** Mark build as needed. Coalesces rapid requests into a single build. */
  private requestBuild(): void {
    this._dirty = true;
    if (!this._building) this.runBuild();
  }

  /** Run builds until no longer dirty. Only one instance runs at a time. */
  private async runBuild(): Promise<void> {
    this._building = true;
    while (this._dirty) {
      this._dirty = false;
      if (!(await this.initialize())) break;

      const mainSource = this._weslSrc[this._rootModuleName];
      if (!mainSource) {
        console.warn(
          `wgsl-play: root module "${this._rootModuleName}" not found in sources:`,
          Object.keys(this._weslSrc),
        );
        continue;
      }

      try {
        this.errorOverlay.hide();
        const result = await this.buildPipeline(mainSource);
        if (!this._dirty) this.applyBuild(result);
      } catch (error) {
        if (!this._dirty) this.handleCompileError(error);
      }
    }
    this._building = false;
  }

  /** Fetch deps if needed and create the render pipeline. */
  private async buildPipeline(mainSource: string): Promise<BuildResult> {
    if (this._fetchSources || this._fetchLibs) {
      const { weslSrc, libs } = await fetchDependencies(mainSource, {
        shaderRoot: this.getConfigOverrides()?.shaderRoot,
        existingSources: this._weslSrc,
        fetchLibs: this._fetchLibs,
        fetchSources: this._fetchSources,
      });
      this._weslSrc = { ...this._weslSrc, ...weslSrc };
      this._libs = dedupLibs(this._libs, libs);
    }
    return createPipeline(
      this.renderState!,
      mainSource,
      source => this.resolveHostTexture(source),
      {
        ...this._linkOptions,
        weslSrc: this._weslSrc,
        libs: this._libs,
        rootModuleName: this._rootModuleName,
      },
    );
  }

  /** Resolve a @texture(name) to a decoded image from light-DOM children.
   *  Prefers [data-texture="name"], falls back to #id. */
  private resolveHostTexture: ResolveUserTexture = async source => {
    const selector = `[data-texture="${cssEscape(source)}"], #${cssEscape(source)}`;
    const el = this.querySelector<HTMLElement>(selector);
    if (!el) return null;
    if (el instanceof HTMLImageElement) return decodeImage(el, source);
    if (el instanceof HTMLCanvasElement) return el;
    throw new ResourceLoadError(
      `@texture(${source}): matched element is a <${el.tagName.toLowerCase()}>; expected <img> or <canvas>`,
      source,
    );
  };

  /** Watch light-DOM for <img> add/remove/src changes and trigger a rebuild. */
  private observeLightDomChildren(): void {
    if (this._childObserver) return;
    this._childObserver = new MutationObserver(records => {
      for (const r of records) {
        if (r.type === "attributes") {
          this.requestBuild();
          return;
        }
        for (const node of [...r.addedNodes, ...r.removedNodes]) {
          if (node instanceof HTMLImageElement) {
            this.requestBuild();
            return;
          }
        }
      }
    });
    this._childObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "id", "data-texture"],
    });
  }

  /** Apply a successful build: flush uniforms, update controls, render. */
  private applyBuild(result: BuildResult): void {
    this.flushPendingUniforms();
    const controls = this.renderState!.uniformState.layout.controls;
    this.settings.setControls(controls);
    this.applyMode(result);
    this.dispatchEvent(new CustomEvent("compile-success"));
    this.dispatchEvent(
      new CustomEvent("uniforms-layout", { detail: result.layout }),
    );
  }

  /** Show canvas vs results panel and (re-)render based on build mode. */
  private applyMode(result: BuildResult): void {
    this._currentMode = result.mode;
    if (result.mode === "compute") {
      this.canvas.hidden = true;
      this.resultsPanel.hidden = false;
      this.controls.setMode("compute");
      renderResultsPanel({
        panel: this.resultsPanel,
        entries: result.computeReadback ?? [],
      });
      return;
    }
    this.canvas.hidden = false;
    this.resultsPanel.hidden = true;
    this.controls.setMode("render");
    if (!this.playback.isPlaying) renderOnce(this.renderState!, this.playback);
  }

  /** Coalesce rapid uniform/refresh events into a single re-dispatch. */
  private scheduleComputeRerun(): void {
    if (this._rerunPending) return;
    this._rerunPending = true;
    queueMicrotask(async () => {
      this._rerunPending = false;
      if (this._currentMode !== "compute" || !this.renderState) return;
      try {
        this.flushPendingUniforms();
        const entries = await rerunCompute(this.renderState);
        renderResultsPanel({ panel: this.resultsPanel, entries });
      } catch (error) {
        this.handleCompileError(error);
      }
    });
  }

  private handleCompileError(error: unknown): void {
    const message = (error as any)?.message ?? String(error);
    this.errorOverlay.show(message);

    const source = error instanceof WeslParseError ? "wesl" : "webgpu";
    const kind = error instanceof ResourceLoadError ? "resource" : "shader";
    const locations = this.extractLocations(error);
    const detail: CompileErrorDetail = {
      message,
      source,
      kind,
      locations,
      ...(error instanceof ResourceLoadError
        ? { resourceSource: error.resourceSource }
        : {}),
    };
    this.dispatchEvent(new CustomEvent("compile-error", { detail }));
  }

  /** Extract source locations from a WESL parse error or GPU compilation error. */
  private extractLocations(error: unknown): CompileErrorLocation[] {
    // WESL linker errors attach a single weslLocation
    const loc = (error as any)?.weslLocation;
    if (loc) {
      const message = (error as any)?.message ?? "";
      const { file, line, column, length, offset } = loc;
      const severity = "error" as const;
      return [
        { file, line, column: column - 1, length, offset, severity, message },
      ];
    }
    // GPU compilation errors have multiple messages
    const msgs = (error as any)?.compilationInfo?.messages;
    if (msgs) {
      const toSeverity = (t: string) =>
        t === "warning" ? "warning" : t === "info" ? "info" : "error";
      return msgs.map((m: any) => ({
        file: m.module?.url,
        line: m.lineNum,
        column: m.linePos - 1,
        length: m.length,
        offset: m.offset,
        severity: toSeverity(m.type),
        message: m.message,
      }));
    }
    return [];
  }
}

function getTemplate(): HTMLTemplateElement {
  if (!template) {
    template = document.createElement("template");
    template.innerHTML = `<canvas part="canvas"></canvas><div class="results-panel" part="results-panel" hidden></div><div class="resize-handle"></div>`;
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

/** Absorb instance properties set before custom element upgrade.
 * Duplicated in WgslEdit.ts. Later, extract to a shared package. */
function upgradeProperty(el: HTMLElement, prop: string): void {
  if (Object.hasOwn(el, prop)) {
    const value = (el as any)[prop];
    delete (el as any)[prop];
    (el as any)[prop] = value;
  }
}

/** Merge new libs, deduplicating by bundle name. */
function dedupLibs(
  existing: WeslBundle[] | undefined,
  newLibs: WeslBundle[],
): WeslBundle[] {
  if (!existing || newLibs.length === 0)
    return [...(existing ?? []), ...newLibs];
  const names = new Set(newLibs.map(b => b.name));
  return [...existing.filter(b => !names.has(b.name)), ...newLibs];
}

/** Decode an <img> to an ImageBitmap with deterministic upload flags. */
async function decodeImage(
  el: HTMLImageElement,
  source: string,
): Promise<ImageBitmap> {
  try {
    if (!el.complete) await waitForImageLoad(el);
    if (el.decode) await el.decode();
    return await createImageBitmap(el, {
      imageOrientation: "from-image",
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ResourceLoadError(
      `@texture(${source}): failed to decode <img src="${el.src}"> — ${detail}`,
      source,
    );
  }
}

function waitForImageLoad(el: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      el.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      el.removeEventListener("load", onLoad);
      reject(new Error("image load failed"));
    };
    el.addEventListener("load", onLoad, { once: true });
    el.addEventListener("error", onError, { once: true });
  });
}

/** Escape a value for safe use as an attribute-selector literal or id selector. */
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
}

/** Normalize all keys in a weslSrc record to module paths. */
function toModulePaths(
  weslSrc: Record<string, string>,
  pkg: string,
): Record<string, string> {
  const entries = Object.entries(weslSrc).map(
    ([key, value]) => [fileToModulePath(key, pkg, false), value] as const,
  );
  return Object.fromEntries(entries);
}
