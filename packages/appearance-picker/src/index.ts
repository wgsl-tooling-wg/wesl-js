export {
  type Appearance,
  type AppearanceChangeDetail,
  AppearancePicker,
  type Resolved,
  type StorageMode,
} from "./AppearancePicker.ts";

import { AppearancePicker } from "./AppearancePicker.ts";

if (!customElements.get("appearance-picker")) {
  customElements.define("appearance-picker", AppearancePicker);
}
