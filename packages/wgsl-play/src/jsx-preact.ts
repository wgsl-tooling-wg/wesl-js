/** Preact JSX augmentation for `<wgsl-play>`.
 *  Side-effect import: `import "wgsl-play/jsx-preact"` once anywhere in your TS source. */

import type { HTMLAttributes } from "preact";
import type { WgslPlay, WgslPlayAttrs } from "./WgslPlay.ts";

type WgslPlayTag = HTMLAttributes<WgslPlay> & WgslPlayAttrs;

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "wgsl-play": WgslPlayTag;
    }
  }
}
