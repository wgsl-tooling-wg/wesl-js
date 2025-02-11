import { createEsbuildPlugin } from "unplugin";
import { weslPlugin } from "../weslPlugin.js";

export default createEsbuildPlugin(weslPlugin);
