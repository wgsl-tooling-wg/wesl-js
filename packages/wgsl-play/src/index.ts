export * from "wesl-fetch";
export * from "./Config.ts";
export * from "./WgslPlay.ts";

import { WgslPlay } from "./WgslPlay.ts";

// Auto-register the custom element
if (typeof customElements !== "undefined" && !customElements.get("wgsl-play")) {
  customElements.define("wgsl-play", WgslPlay);
}
