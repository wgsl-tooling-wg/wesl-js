/// <reference types="wesl-plugin" />
import { layoutEntries } from "./shaders/app.wesl?reflect";
document.getElementById("app")!.innerHTML =
  "Plugin Test: " + [...Object.keys(layoutEntries)].toString();
