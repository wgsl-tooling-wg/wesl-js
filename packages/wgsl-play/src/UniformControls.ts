import type { UniformControl } from "wesl-reflect";

/** Uniform controls panel for wgsl-play. Collapsed by default, toggle on hover. */
export class UniformControls {
  private container: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private panel: HTMLDivElement;
  private panelInner: HTMLDivElement;
  private expanded = false;
  private onChange: (name: string, value: number | number[]) => void;

  constructor(
    shadow: ShadowRoot,
    onChange: (name: string, value: number | number[]) => void,
  ) {
    this.onChange = onChange;

    this.container = document.createElement("div");
    this.container.className = "settings";

    this.toggleBtn = document.createElement("button");
    this.toggleBtn.className = "uniform-toggle";
    this.toggleBtn.innerHTML = chevronSvg;
    this.toggleBtn.addEventListener("click", () => this.toggle());

    this.panel = document.createElement("div");
    this.panel.className = "uniform-panel";
    this.panelInner = document.createElement("div");
    this.panelInner.className = "uniform-panel-inner";
    this.panel.appendChild(this.panelInner);

    this.container.append(this.toggleBtn, this.panel);
    shadow.appendChild(this.container);
  }

  /** Update controls from a new set of UniformControl descriptors. */
  setControls(controls: UniformControl[]): void {
    this.panelInner.innerHTML = "";
    if (controls.length === 0) {
      this.container.classList.add("empty");
      return;
    }
    this.container.classList.remove("empty");
    for (const c of controls) this.panelInner.appendChild(this.buildControl(c));
  }

  /** Show/hide the controls container. */
  show(): void {
    this.container.style.display = "";
  }
  hide(): void {
    this.container.style.display = "none";
  }

  private toggle(): void {
    this.expanded = !this.expanded;
    this.container.classList.toggle("expanded", this.expanded);
  }

  /** Create a DOM input element (range slider, color picker, or checkbox) for a uniform. */
  private buildControl(c: UniformControl): HTMLElement {
    const row = document.createElement("div");
    row.className = "uniform-row";

    const label = document.createElement("label");
    label.textContent = c.name;

    if (c.kind === "range") {
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(c.min);
      input.max = String(c.max);
      input.value = String(c.initial);
      if (c.step) input.step = String(c.step);
      else input.step = c.type === "i32" ? "1" : "0.01";

      const valueSpan = document.createElement("span");
      valueSpan.className = "uniform-value";
      valueSpan.textContent = String(c.initial);

      input.addEventListener("input", () => {
        const v = Number(input.value);
        valueSpan.textContent = input.value;
        this.onChange(c.name, v);
      });
      row.append(label, input, valueSpan);
    } else if (c.kind === "color") {
      const input = document.createElement("input");
      input.type = "color";
      input.value = rgbToHex(c.initial);
      input.addEventListener("input", () => {
        this.onChange(c.name, hexToRgb(input.value));
      });
      row.append(label, input);
    } else if (c.kind === "toggle") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = c.initial === 1;
      input.addEventListener("change", () => {
        this.onChange(c.name, input.checked ? 1 : 0);
      });
      row.append(label, input);
    }

    return row;
  }
}

const chevronSvg = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
  <path d="M4.7 5.3L8 8.6l3.3-3.3.7.7L8 10 4 6l.7-.7z"/>
</svg>`;

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}
