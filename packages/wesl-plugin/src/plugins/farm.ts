import { createFarmPlugin } from "unplugin";
import { weslPlugin } from "../WeslPlugin";

// typed as any to avoid requiring @farmfe/core types at build time
export default createFarmPlugin(weslPlugin) as any;
