import cssText from "./AppearancePicker.css?inline";
import { moonIcon, sunIcon } from "./Icons.ts";

export type Appearance = "system" | "light" | "dark";
export type Resolved = "light" | "dark";
export type StorageMode = "localStorage" | "cookie" | "none";

/** Detail payload of the `appearance-change` CustomEvent. */
export interface AppearanceChangeDetail {
  preference: Appearance;
  resolved: Resolved;
}

/** Attributes accepted by `<appearance-picker>` beyond standard HTML.
 *  Source of truth for framework-specific JSX augmentations (see `./jsx-preact.ts`). */
export interface AppearancePickerAttrs {
  /** Initial preference. Defaults to `"system"` (or stored value if present). */
  appearance?: Appearance;
  /** Where to persist the preference. */
  storage?: StorageMode;
}

const storageKey = "appearance";

// Lazy-init so non-DOM imports (SSR, type-only consumers) don't fail at module
// load: `new CSSStyleSheet()` requires a browser environment.
let cachedStyleSheet: CSSStyleSheet | undefined;

/**
 * Tri-state appearance switcher (`system` / `light` / `dark`).
 *
 * Side effects: sets `data-theme="light|dark"` on `<html>` (removed in system
 * mode), persists preference to storage, dispatches `appearance-change`.
 */
export class AppearancePicker extends HTMLElement {
  static observedAttributes = ["appearance"];

  private lightBtn: HTMLButtonElement;
  private darkBtn: HTMLButtonElement;
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener = (): void => this.onSystemChange();
  private connected = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [getStyles()];
    this.lightBtn = makeButton("Light mode", sunIcon, () =>
      this.toggle("light"),
    );
    this.darkBtn = makeButton("Dark mode", moonIcon, () => this.toggle("dark"));
    shadow.append(this.lightBtn, this.darkBtn);
  }

  connectedCallback(): void {
    if (!this.hasAttribute("appearance")) {
      const stored = readStored(this.storageMode);
      if (stored) this.setAttribute("appearance", stored);
    }
    this.connected = true;
    this.mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    this.mediaQuery.addEventListener("change", this.mediaListener);
    this.apply();
  }

  disconnectedCallback(): void {
    this.mediaQuery?.removeEventListener("change", this.mediaListener);
    this.mediaQuery = null;
    this.connected = false;
  }

  attributeChangedCallback(name: string): void {
    if (name === "appearance" && this.connected) this.apply();
  }

  /** Current appearance preference (matches the `appearance` attribute). */
  get appearance(): Appearance {
    return normalize(this.getAttribute("appearance"));
  }

  set appearance(value: Appearance) {
    if (value === "system") this.removeAttribute("appearance");
    else this.setAttribute("appearance", value);
  }

  /** The resolved theme actually in effect, accounting for system preference. */
  get resolved(): Resolved {
    return resolve(this.appearance);
  }

  private get storageMode(): StorageMode {
    const value = this.getAttribute("storage");
    return value === "cookie" || value === "none" ? value : "localStorage";
  }

  private toggle(target: Resolved): void {
    this.appearance = this.appearance === target ? "system" : target;
  }

  private onSystemChange(): void {
    if (this.appearance === "system") this.apply();
  }

  private apply(): void {
    const preference = this.appearance;
    this.lightBtn.classList.toggle("active", preference === "light");
    this.darkBtn.classList.toggle("active", preference === "dark");
    setDocumentTheme(preference);
    persist(preference, this.storageMode);
    const detail: AppearanceChangeDetail = {
      preference,
      resolved: resolve(preference),
    };
    this.dispatchEvent(
      new CustomEvent<AppearanceChangeDetail>("appearance-change", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

function getStyles(): CSSStyleSheet {
  if (!cachedStyleSheet) {
    cachedStyleSheet = new CSSStyleSheet();
    cachedStyleSheet.replaceSync(cssText);
  }
  return cachedStyleSheet;
}

function makeButton(
  label: string,
  svg: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = svg;
  btn.addEventListener("click", onClick);
  return btn;
}

function readStored(mode: StorageMode): Resolved | null {
  if (mode === "localStorage") {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  }
  if (mode === "cookie") {
    const match = document.cookie.match(/(?:^|; )appearance=(light|dark)/);
    return (match?.[1] as Resolved | undefined) ?? null;
  }
  return null;
}

function normalize(value: string | null): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}

function resolve(pref: Appearance): Resolved {
  if (pref !== "system") return pref;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setDocumentTheme(pref: Appearance): void {
  const html = document.documentElement;
  if (pref === "system") delete html.dataset.theme;
  else html.dataset.theme = pref;
}

function persist(pref: Appearance, mode: StorageMode): void {
  if (mode === "none") return;
  if (mode === "localStorage") {
    if (pref === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, pref);
    return;
  }
  const value = pref === "system" ? "" : pref;
  const maxAge = pref === "system" ? 0 : 31536000;
  // biome-ignore lint/suspicious/noDocumentCookie: no alternative API for setting cookies
  document.cookie = `${storageKey}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}
