import type { Conditions, WeslBundle, WeslProject } from "wesl";
import { fileToModulePath, WeslParseError } from "wesl";
import { fetchDependencies, loadShaderFromUrl } from "wesl-fetch";
import type { WgslPlayConfig } from "./Config.ts";
import { ErrorOverlay } from "./ErrorOverlay.ts";
import { PlaybackControls } from "./PlaybackControls.ts";
import {
  calculateTime,
  createPipeline,
  initWebGPU,
  type LinkOptions,
  type PlaybackState,
  type RenderState,
  startRenderLoop,
} from "./Renderer.ts";
import { UniformControls } from "./UniformControls.ts";
import cssText from "./WgslPlay.css?inline";

export { defaults, getConfig, resetConfig } from "./Config.ts";

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
    "from",
    "no-controls",
    "no-settings",
    "theme",
    "autoplay",
    "transparent",
    "fetch-libs",
    "fetch-sources",
  ];

  private canvas: HTMLCanvasElement;
  private errorOverlay: ErrorOverlay;
  private controls: PlaybackControls;
  private settings: UniformControls;
  private resizeObserver: ResizeObserver;
  private stopRenderLoop?: () => void;

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
    this.settings = new UniformControls(shadow, (name, value) =>
      this.setUniform(name, value),
    );
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
    if (!this.autoplay) {
      this.playback.isPlaying = false;
      this.controls.setPlaying(false);
    }
    this.initialize();
    upgradeProperty(this, "conditions");
    upgradeProperty(this, "shader");
    upgradeProperty(this, "project");
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    this.stopRenderLoop?.();
    this._pointerCleanup?.();
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
    const detail = { isPlaying: playing };
    this.dispatchEvent(new CustomEvent("playback-change", { detail }));
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

  /** Set a uniform value by name. Works before or after compilation. */
  setUniform(name: string, value: number | number[]): void {
    this.pendingUniforms.set(name, value);
    this.renderState?.uniformState.controlValues.set(name, value);
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
      const x = (e.clientX - rect.left) * devicePixelRatio;
      const y = (e.clientY - rect.top) * devicePixelRatio;
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
      this.setupMouseTracking();
      this.loadInitialContent();
      this.stopRenderLoop = startRenderLoop(this.renderState, this.playback);
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
        const layout = await createPipeline(this.renderState!, mainSource, {
          ...this._linkOptions,
          weslSrc: this._weslSrc,
          libs: this._libs,
          rootModuleName: this._rootModuleName,
        });
        if (!this._dirty) {
          this.flushPendingUniforms();
          const controls = this.renderState!.uniformState.layout.controls;
          this.settings.setControls(controls);
          this.dispatchEvent(new CustomEvent("compile-success"));
          this.dispatchEvent(
            new CustomEvent("uniforms-layout", { detail: layout }),
          );
        }
      } catch (error) {
        if (!this._dirty) this.handleCompileError(error);
      }
    }
    this._building = false;
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
      const message = (error as any)?.message ?? "";
      return [
        {
          file: loc.file,
          line: loc.line,
          column: loc.column - 1,
          length: loc.length,
          severity: "error" as const,
          message,
        },
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

// LATER: extract to shared web component utils if we add more helpers
/** Absorb instance properties set before custom element upgrade. */
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
