/** a renderable element */
export interface Drawable {
  draw(): void;
}

/** a drawable that can be animated continuously */
export class Loopable {
  private looping: boolean = true;

  constructor(private drawable: Drawable, run = true) {
    this.looping = run; // initialize the looping state from the constructor
    if (!run) drawable.draw(); // ensure we draw once to start
    this.drawRepeat();
  }

  get running(): boolean {
    return this.looping;
  }

  run(value: boolean) {
    if (value === this.looping) return;
    this.looping = value;
    if (value) {
      // restart the drawing loop
      this.drawRepeat();
    }
  }

  /** draw repeatedly until 'loop' property is set to false */
  drawRepeat(): void {
    if (!this.looping) return;
    this.drawable.draw();
    requestAnimationFrame(() => this.drawRepeat());
  }
}
