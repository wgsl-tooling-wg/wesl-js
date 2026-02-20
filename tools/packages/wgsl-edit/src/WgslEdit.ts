import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic, forceLinting } from "@codemirror/lint";
import {
  Compartment,
  type EditorSelection,
  EditorState,
  type Extension,
  Text,
} from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import { basicSetup, EditorView } from "codemirror";
import {
  type Conditions,
  fileToModulePath,
  type LinkParams,
  type WeslBundle,
} from "wesl";
import { fetchPackagesByName } from "wesl-fetch";
import { createWeslLinter, wesl } from "./Language.ts";
import cssText from "./WgslEdit.css?inline";

export type WeslProject = Pick<
  LinkParams,
  | "weslSrc"
  | "rootModuleName"
  | "conditions"
  | "constants"
  | "libs"
  | "packageName"
>;

type Theme = "light" | "dark" | "auto";

type LintMode = "on" | "off";

interface FileState {
  doc: Text;
  scrollPos?: number;
  selection?: EditorSelection;
}

/*  WESL syntax colors
 *
 *  | Name       | Elements                             |
 *  |------------|--------------------------------------|
 *  | variable   | variables, params, struct members    |
 *  | keyword    | import, package, super, booleans     |
 *  | control    | fn, if, return, break, for, while    |
 *  | type       | types, type defs, template calls     |
 *  | fn         | function name definitions            |
 *  | number     | numeric literals                     |
 *  | comment    | line and block comments              |
 *  | modulePath | import path identifiers              |
 */

// prettier-ignore
const light = {
  variable: "#000f80",
  keyword: "#0000ff",
  control: "#af00db",
  type: "#891a1a",
  fn: "#795e26",
  number: "#098658",
  comment: "#008000",
  modulePath: "#0070c1",
};

// prettier-ignore
const dark = {
  variable: "#9cdcfe",
  keyword: "#569cd6",
  control: "#c586c0",
  type: "#4ec9b0",
  fn: "#dcdcaa",
  number: "#b5cea8",
  comment: "#6a9955",
  modulePath: "#4fc1ff",
};

const lightColors = weslColors(light);
const darkColors = weslColors(dark);

let cachedStyleSheet: CSSStyleSheet | undefined;

export class WgslEdit extends HTMLElement {
  static observedAttributes = [
    "src",
    "readonly",
    "theme",
    "shader-root",
    "tabs",
    "lint",
    "lint-from",
    "line-numbers",
  ];

  private editorView: EditorView | null = null;
  private editorContainer: HTMLDivElement;
  private tabBar: HTMLDivElement;
  private snackbar: HTMLDivElement;
  private readonlyCompartment = new Compartment();
  private themeCompartment = new Compartment();
  private lintCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private _pendingSource: string | null = null;
  private _theme: Theme = "auto";
  private _mediaQuery: MediaQueryList | null = null;
  private _lineNumbers = false;

  private _files: Map<string, FileState> = new Map();
  private _activeFile = "";
  private _tabs = true;
  private _lint: LintMode = "on";
  private _conditions: Conditions = {};
  private _packageName: string | undefined;
  private _libs: WeslBundle[] = [];
  private _ignorePackages: string[] = ["constants", "test"];
  private _fetchingPkgs = new Set<string>();
  private _snackTimer: ReturnType<typeof setTimeout> | undefined;
  private _externalDiagnostics: Diagnostic[] = [];
  private _lintFromEl: Element | null = null;
  /** Bound listeners for lint-from element's compile events. */
  private _boundCompileError = this.onCompileError.bind(this);
  private _boundCompileSuccess = this.onCompileSuccess.bind(this);

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [getStyles()];

    this.tabBar = document.createElement("div");
    this.tabBar.className = "tab-bar";
    shadow.appendChild(this.tabBar);

    this.editorContainer = document.createElement("div");
    this.editorContainer.className = "editor-container";
    shadow.appendChild(this.editorContainer);

    this.snackbar = document.createElement("div");
    this.snackbar.className = "snackbar";
    this.snackbar.textContent = "Loading\u2026"; // \u2026 = ellipsis
    shadow.appendChild(this.snackbar);
  }

  connectedCallback(): void {
    this.initEditor();
    this.loadInitialContent();
  }

  disconnectedCallback(): void {
    this.connectLintSource(null);
    this.editorView?.destroy();
    this.editorView = null;
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null,
  ): void {
    if (name === "src" && value && this.editorView) {
      this.loadFromUrl(value);
    } else if (name === "readonly") {
      this.updateReadonly();
    } else if (name === "theme") {
      this.theme = (value as Theme) || "auto";
    } else if (name === "tabs") {
      this._tabs = value !== "false";
      this.renderTabs();
    } else if (name === "lint") {
      this._lint = (value as LintMode) || "on";
      this.updateLint();
    } else if (name === "lint-from") {
      this.connectLintSource(value);
    } else if (name === "line-numbers") {
      this._lineNumbers = value === "true";
      this.updateLineNumbers();
    }
  }

  /** Active file content (backward compatible). */
  get source(): string {
    return this.editorView?.state.doc.toString() ?? this._pendingSource ?? "";
  }

  /** Set active file content (backward compatible). */
  set source(value: string) {
    if (this.editorView) {
      const to = this.editorView.state.doc.length;
      this.editorView.dispatch({ changes: { from: 0, to, insert: value } });
    } else {
      this._pendingSource = value;
    }
  }

  /** All file contents keyed by module path (e.g., "package::main"). */
  get sources(): Record<string, string> {
    this.saveCurrentFileState();
    const pkg = this._packageName ?? "package";
    const result: Record<string, string> = {};
    for (const [tabName, state] of this._files) {
      result[fileToModulePath(tabName, pkg, false)] = state.doc.toString();
    }
    return result;
  }

  /** Set all files (replaces existing). */
  set sources(value: Record<string, string>) {
    this._files.clear();
    for (const [key, content] of Object.entries(value)) {
      const tabName = toTabName(key);
      this._files.set(tabName, { doc: Text.of(content.split("\n")) });
    }
    const firstKey = Object.keys(value)[0];
    if (firstKey) this.switchToFile(toTabName(firstKey));
    this.renderTabs();
  }

  /** Load a full project config (sources, conditions, packageName, etc.). */
  set project(value: WeslProject) {
    const { weslSrc, rootModuleName, conditions, packageName, libs } = value;
    if (conditions !== undefined) this._conditions = conditions;
    if (packageName !== undefined) this._packageName = packageName;
    if (libs !== undefined) this._libs = libs;

    if (weslSrc) {
      this.sources = weslSrc;
      if (rootModuleName) this.activeFile = toTabName(rootModuleName);
    }
    this.updateLint();
  }

  /** Currently active file name. */
  get activeFile(): string {
    return this._activeFile;
  }

  /** Switch to a file by name. */
  set activeFile(name: string) {
    this.switchToFile(name);
  }

  /** List of file names in order. */
  get fileNames(): string[] {
    return Array.from(this._files.keys());
  }

  /** Tab bar visibility. */
  get tabs(): boolean {
    return this._tabs;
  }

  set tabs(value: boolean) {
    this._tabs = value;
    this.renderTabs();
  }

  /** Lint mode: "on" (default) or "off". */
  get lint(): LintMode {
    return this._lint;
  }

  set lint(value: LintMode) {
    this._lint = value;
    this.updateLint();
  }

  /** Line numbers visibility (default: true). */
  get lineNumbers(): boolean {
    return this._lineNumbers;
  }

  set lineNumbers(value: boolean) {
    this._lineNumbers = value;
    if (value) this.setAttribute("line-numbers", "true");
    else this.removeAttribute("line-numbers");
  }

  /** Whether the editor is currently loading content. */
  get loading(): boolean {
    return this.snackbar.classList.contains("visible");
  }

  set loading(value: boolean) {
    if (value) this.showSnack("Loading\u2026");
    else this.hideSnack();
  }

  /** Show the snackbar with a message. Auto-hides after `ms` if provided. */
  private showSnack(msg: string, ms?: number): void {
    clearTimeout(this._snackTimer);
    this.snackbar.textContent = msg;
    this.snackbar.classList.add("visible");
    if (ms) this._snackTimer = setTimeout(() => this.hideSnack(), ms);
  }

  private hideSnack(): void {
    clearTimeout(this._snackTimer);
    this.snackbar.classList.remove("visible");
  }

  get readonly(): boolean {
    return this.hasAttribute("readonly");
  }

  set readonly(value: boolean) {
    if (value) this.setAttribute("readonly", "");
    else this.removeAttribute("readonly");
  }

  get theme(): Theme {
    return this._theme;
  }

  set theme(value: Theme) {
    this._theme = value;
    this.updateTheme();
  }

  get shaderRoot(): string | null {
    return this.getAttribute("shader-root");
  }

  set shaderRoot(value: string | null) {
    if (value) this.setAttribute("shader-root", value);
    else this.removeAttribute("shader-root");
  }

  /** Add a new file. */
  addFile(name: string, content = ""): void {
    if (this._files.has(name)) return;
    this._files.set(name, { doc: Text.of(content.split("\n")) });
    this.switchToFile(name);
    this.renderTabs();
    this.dispatchFileChange("add", name);
  }

  /** Remove a file. */
  removeFile(name: string): void {
    if (!this._files.has(name) || this._files.size <= 1) return;
    this._files.delete(name);
    if (this._activeFile === name) {
      const firstFile = this._files.keys().next().value!;
      this.switchToFile(firstFile);
    }
    this.renderTabs();
    this.dispatchFileChange("remove", name);
  }

  /** Rename a file. */
  renameFile(oldName: string, newName: string): void {
    const state = this._files.get(oldName);
    if (!state || this._files.has(newName)) return;
    this._files.delete(oldName);
    this._files.set(newName, state);
    if (this._activeFile === oldName) this._activeFile = newName;
    this.renderTabs();
    this.dispatchFileChange("rename", newName);
  }

  /** Switch to a file, saving current state and restoring target state. */
  private switchToFile(name: string): void {
    if (!this._files.has(name) || name === this._activeFile) return;
    this.saveCurrentFileState();
    this._activeFile = name;

    const fileState = this._files.get(name)!;
    if (this.editorView) {
      const to = this.editorView.state.doc.length;
      const changes = { from: 0, to, insert: fileState.doc.toString() };
      const effects = EditorView.scrollIntoView(fileState.scrollPos ?? 0);
      this.editorView.dispatch({
        changes,
        selection: fileState.selection,
        effects,
      });
    }
    this.renderTabs();
  }

  /** Save current editor state to the active file. */
  private saveCurrentFileState(): void {
    if (!this.editorView || !this._activeFile) return;
    const state = this._files.get(this._activeFile);
    if (state) {
      state.doc = this.editorView.state.doc;
      state.selection = this.editorView.state.selection;
      state.scrollPos = this.editorView.scrollDOM.scrollTop;
    }
  }

  private dispatchFileChange(action: string, file: string): void {
    this.dispatchEvent(
      new CustomEvent("file-change", { detail: { action, file } }),
    );
  }

  private initEditor(): void {
    this.readInitialAttributes();
    this.parseInlineContent();

    this._mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    this._mediaQuery.addEventListener("change", () => this.updateTheme());

    const firstFile = this._files.keys().next().value;
    const initialDoc =
      this._pendingSource ??
      (firstFile ? this._files.get(firstFile)!.doc.toString() : "");
    this._pendingSource = null;
    if (firstFile) this._activeFile = firstFile;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: this.buildExtensions(),
    });

    this.editorView = new EditorView({ state, parent: this.editorContainer });
    this.renderTabs();
  }

  private readInitialAttributes(): void {
    const themeAttr = this.getAttribute("theme") as Theme | null;
    if (themeAttr) this._theme = themeAttr;
    const tabsAttr = this.getAttribute("tabs");
    if (tabsAttr !== null) this._tabs = tabsAttr !== "false";
    const lintAttr = this.getAttribute("lint") as LintMode | null;
    if (lintAttr) this._lint = lintAttr;
    const lineNumAttr = this.getAttribute("line-numbers");
    if (lineNumAttr !== null) this._lineNumbers = lineNumAttr === "true";
    const lintFromAttr = this.getAttribute("lint-from");
    if (lintFromAttr) this.connectLintSource(lintFromAttr);
  }

  private buildExtensions(): Extension[] {
    const baseTheme = EditorView.theme({
      ".cm-content": { padding: "0" },
      ".cm-line": { padding: "0" },
    });
    return [
      basicSetup,
      wesl(),
      baseTheme,
      this.themeCompartment.of(this.resolveTheme()),
      this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly)),
      this.lintCompartment.of(this.resolveLint()),
      this.lineNumbersCompartment.of(this.resolveLineNumbers()),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          this._externalDiagnostics = [];
          this.saveCurrentFileState();
          const { source, sources, _activeFile: activeFile } = this;
          const detail = { source, sources, activeFile };
          this.dispatchEvent(new CustomEvent("change", { detail }));
        }
      }),
    ];
  }

  private resolveTheme() {
    const isDark =
      this._theme === "dark" ||
      (this._theme === "auto" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    this.classList.toggle("dark", isDark);
    return [
      EditorView.theme({}, { dark: isDark }),
      isDark ? darkColors : lightColors,
    ];
  }

  private updateTheme(): void {
    this.editorView?.dispatch({
      effects: this.themeCompartment.reconfigure(this.resolveTheme()),
    });
  }

  private updateReadonly(): void {
    this.editorView?.dispatch({
      effects: this.readonlyCompartment.reconfigure(
        EditorState.readOnly.of(this.readonly),
      ),
    });
    this.renderTabs();
  }

  private resolveLint() {
    if (this._lint === "off") return [];
    return createWeslLinter({
      getSources: () => this.sources,
      rootModule: () =>
        fileToModulePath(
          this._activeFile,
          this._packageName ?? "package",
          false,
        ),
      conditions: () => this._conditions,
      packageName: () => this._packageName,
      getExternalDiagnostics: () => this._externalDiagnostics,
      getLibs: () => this._libs,
      fetchLibs: pkgs => this.fetchLibsOnDemand(pkgs),
      ignorePackages: () => this._ignorePackages,
    });
  }

  /** Fetch missing library packages, deduplicating in-flight requests. */
  private async fetchLibsOnDemand(
    packageNames: string[],
  ): Promise<WeslBundle[]> {
    const needed = packageNames.filter(n => !this._fetchingPkgs.has(n));
    if (needed.length === 0) return [];

    for (const n of needed) this._fetchingPkgs.add(n);
    this.showSnack(`Loading ${needed.join(", ")}…`);
    try {
      const bundles = await fetchPackagesByName(needed);
      this._libs = [...this._libs, ...bundles];
      if (bundles.length > 0)
        this.showSnack(`Loaded ${needed.join(", ")}`, 3000);
      else this.hideSnack();
      return bundles;
    } catch (e) {
      console.warn("wgsl-edit: failed to fetch packages:", needed, e);
      this.showSnack(`Failed to load ${needed.join(", ")}`, 3000);
      return [];
    } finally {
      for (const n of needed) this._fetchingPkgs.delete(n);
    }
  }

  private updateLint(): void {
    this.editorView?.dispatch({
      effects: this.lintCompartment.reconfigure(this.resolveLint()),
    });
  }

  /** Listen for compile-error/compile-success events from a lint source element. */
  private connectLintSource(id: string | null): void {
    if (this._lintFromEl) {
      this._lintFromEl.removeEventListener(
        "compile-error",
        this._boundCompileError,
      );
      this._lintFromEl.removeEventListener(
        "compile-success",
        this._boundCompileSuccess,
      );
      this._lintFromEl = null;
    }
    this._externalDiagnostics = [];
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;
    this._lintFromEl = el;
    el.addEventListener("compile-error", this._boundCompileError);
    el.addEventListener("compile-success", this._boundCompileSuccess);
  }

  private onCompileError(e: Event): void {
    const detail = (e as CustomEvent).detail;
    if (!this.editorView || detail.source === "wesl") return;

    const doc = this.editorView.state.doc;
    const pkg = this._packageName ?? "package";
    const activeModule = fileToModulePath(this._activeFile, pkg, false);
    this._externalDiagnostics = detail.locations
      .filter((loc: any) => {
        if (!loc.file) return true;
        return fileToModulePath(loc.file, pkg, false) === activeModule;
      })
      .map((loc: any) => {
        const line = doc.line(Math.max(1, Math.min(loc.line, doc.lines)));
        const from = Math.min(line.from + (loc.column ?? 0), doc.length);
        const to = Math.min(from + (loc.length ?? 1), doc.length);
        return {
          from,
          to,
          severity: loc.severity,
          message: loc.message,
          source: "WebGPU",
        } as Diagnostic;
      });
    if (this._externalDiagnostics.length) forceLinting(this.editorView);
  }

  private onCompileSuccess(): void {
    if (this._externalDiagnostics.length === 0) return;
    this._externalDiagnostics = [];
    if (this.editorView) forceLinting(this.editorView);
  }

  private resolveLineNumbers(): Extension {
    // basicSetup includes lineNumbers, so we hide via CSS when disabled
    return this._lineNumbers
      ? []
      : EditorView.theme({ ".cm-gutters": { display: "none" } });
  }

  private updateLineNumbers(): void {
    this.editorView?.dispatch({
      effects: this.lineNumbersCompartment.reconfigure(
        this.resolveLineNumbers(),
      ),
    });
  }

  /** Parse script tags into _files. Supports single or multi-file via data-name. */
  private parseInlineContent(): void {
    const scripts = Array.from(
      this.querySelectorAll(
        'script[type="text/wgsl"], script[type="text/wesl"]',
      ),
    );

    if (scripts.length === 0) {
      // Fallback to textContent
      const content = this.textContent?.trim() ?? "";
      if (content)
        this._files.set("main.wesl", { doc: Text.of(content.split("\n")) });
      return;
    }

    for (const script of scripts) {
      const name = script.getAttribute("data-name") || "main.wesl";
      const content = script.textContent?.trim() ?? "";
      this._files.set(name, { doc: Text.of(content.split("\n")) });
    }
  }

  /** Render tab bar based on files and visibility mode. */
  private renderTabs(): void {
    this.tabBar.style.display = this._tabs ? "flex" : "none";
    if (!this._tabs) return;

    this.tabBar.innerHTML = "";
    for (const name of this._files.keys()) {
      this.tabBar.appendChild(this.createTab(name));
    }
    if (!this.readonly) this.tabBar.appendChild(this.createAddButton());
  }

  /** Create a tab button for a file. */
  private createTab(name: string): HTMLButtonElement {
    const tab = document.createElement("button");
    tab.className = "tab" + (name === this._activeFile ? " active" : "");

    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-name";
    nameSpan.textContent = name;

    if (!this.readonly) {
      nameSpan.addEventListener("dblclick", e => {
        e.stopPropagation();
        this.startRenameTab(tab, nameSpan, name);
      });

      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.textContent = "\xd7"; // Multiplication sign
      closeBtn.addEventListener("click", e => {
        e.stopPropagation();
        this.removeFile(name);
      });
      tab.append(nameSpan, closeBtn);
    } else {
      tab.append(nameSpan);
    }

    tab.addEventListener("click", () => this.switchToFile(name));
    return tab;
  }

  /** Create the "+" button for adding new files. */
  private createAddButton(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "tab-add";
    btn.textContent = "+";
    btn.addEventListener("click", () => {
      let name = "new.wesl";
      let i = 1;
      while (this._files.has(name)) name = `new${i++}.wesl`;
      this.addFile(name);
    });
    return btn;
  }

  /** Start inline rename of a tab. */
  private startRenameTab(
    tab: HTMLElement,
    nameSpan: HTMLElement,
    oldName: string,
  ): void {
    const input = document.createElement("input");
    input.className = "tab-rename";
    input.value = oldName;
    input.size = Math.max(oldName.length, 8);

    const finishRename = () => {
      const newName = input.value.trim() || oldName;
      if (newName !== oldName && !this._files.has(newName)) {
        this.renameFile(oldName, newName);
      } else {
        nameSpan.style.display = "";
        input.remove();
      }
    };

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishRename();
      }
      if (e.key === "Escape") {
        nameSpan.style.display = "";
        input.remove();
      }
    });
    input.addEventListener("blur", finishRename);
    input.addEventListener("input", () => {
      input.size = Math.max(input.value.length, 8);
    });

    nameSpan.style.display = "none";
    tab.insertBefore(input, nameSpan);
    input.focus();
    input.select();
  }

  private async loadFromUrl(url: string): Promise<void> {
    this.loading = true;
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      this.source = await response.text();
    } catch (e) {
      console.error("wgsl-edit: Failed to load source:", e);
    } finally {
      this.loading = false;
    }
  }

  private loadInitialContent(): void {
    const src = this.getAttribute("src");
    if (src) this.loadFromUrl(src);
  }
}

function weslColors(c: typeof light) {
  return syntaxHighlighting(
    HighlightStyle.define(
      [
        { tag: t.variableName, color: c.variable },
        { tag: t.definition(t.variableName), color: c.variable },
        { tag: t.propertyName, color: c.variable },
        { tag: t.keyword, color: c.keyword },
        { tag: t.definitionKeyword, color: c.keyword },
        { tag: t.controlKeyword, color: c.control },
        { tag: t.bool, color: c.keyword },
        { tag: t.typeName, color: c.type },
        { tag: t.definition(t.typeName), color: c.type },
        { tag: t.function(t.variableName), color: c.fn },
        { tag: t.function(t.definition(t.variableName)), color: c.fn },
        { tag: t.number, color: c.number },
        { tag: t.lineComment, color: c.comment },
        { tag: t.blockComment, color: c.comment },
        { tag: t.namespace, color: c.modulePath },
      ],
      { all: { fontWeight: "normal", fontStyle: "normal" } },
    ),
  );
}

function getStyles(): CSSStyleSheet {
  if (!cachedStyleSheet) {
    cachedStyleSheet = new CSSStyleSheet();
    cachedStyleSheet.replaceSync(cssText);
  }
  return cachedStyleSheet;
}

/** Convert a module path or file path to a tab name: "package::main" -> "main", "main.wesl" -> "main.wesl" */
function toTabName(key: string): string {
  if (key.includes("::"))
    return key.replace(/^[^:]+::/, "").replaceAll("::", "/");
  return key.replace(/^\.\//, "");
}
