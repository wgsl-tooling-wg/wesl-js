export { wesl, weslLanguage } from "./Language.ts";
export { WgslEdit } from "./WgslEdit.ts";

import { WgslEdit } from "./WgslEdit.ts";

if (!customElements.get("wgsl-edit")) {
  customElements.define("wgsl-edit", WgslEdit);
}
