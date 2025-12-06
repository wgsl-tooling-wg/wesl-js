/** Manages an error overlay element within a shadow DOM. */
export class ErrorOverlay {
  private el: HTMLDivElement;
  private _message: string | null = null;

  constructor(container: ShadowRoot, onDismiss?: () => void) {
    this.el = document.createElement("div");
    this.el.className = "error-overlay";
    if (onDismiss) this.el.addEventListener("click", onDismiss);
    container.appendChild(this.el);
  }

  show(message: string): void {
    this._message = message;
    this.el.textContent = message;
    this.el.classList.add("visible");
    console.error("[wgsl-play]", message);
  }

  hide(): void {
    this._message = null;
    this.el.classList.remove("visible");
  }

  get visible(): boolean {
    return this.el.classList.contains("visible");
  }

  get message(): string | null {
    return this._message;
  }
}
