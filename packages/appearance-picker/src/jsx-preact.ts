/** Preact JSX augmentation for `<appearance-picker>`.
 *  Side-effect import: `import "appearance-picker/jsx-preact"` once anywhere in your TS source. */

import type { HTMLAttributes } from "preact";
import type {
  AppearancePicker,
  AppearancePickerAttrs,
} from "./AppearancePicker.ts";

type AppearancePickerTag = HTMLAttributes<AppearancePicker> &
  AppearancePickerAttrs;

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "appearance-picker": AppearancePickerTag;
    }
  }
}
