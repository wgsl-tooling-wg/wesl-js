import { createEsbuildPlugin } from "unplugin";
import { weslPlugin } from "../WeslPlugin.js";

export default createEsbuildPlugin(weslPlugin);
