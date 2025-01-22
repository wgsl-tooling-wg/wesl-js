import { layouts } from "./shaders/app.wesl?reflect";
document.getElementById("app")!.innerHTML =
  "Plugin Test: " + [...Object.keys(layouts)].toString();
