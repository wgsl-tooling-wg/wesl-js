/** Preact JSX augmentation for `<wgsl-edit>`.
 *  Side-effect import: `import "wgsl-edit/jsx-preact"` once anywhere in your TS source. */

import type { HTMLAttributes } from "preact";
import type { WgslEdit, WgslEditAttrs } from "./WgslEdit.ts";

type WgslEditTag = HTMLAttributes<WgslEdit> & WgslEditAttrs;

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "wgsl-edit": WgslEditTag;
    }
  }
}
