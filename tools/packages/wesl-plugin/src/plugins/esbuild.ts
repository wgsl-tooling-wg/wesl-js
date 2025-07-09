import { createEsbuildPlugin } from "unplugin";
import { weslPlugin } from "../WeslPlugin.ts";

export default createEsbuildPlugin(weslPlugin);
