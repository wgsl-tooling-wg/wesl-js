/// <reference types="vitest/config" />
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from "../plugin/src/plugins/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { simpleReflect } from "./src/SimpleReflectExtension.js";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");
const typesDir = path.join(path.dirname(thisPath), "generated/types");

const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl({
      weslToml,
      buildPlugins: [simpleReflect({ typesDir })],
    }),
  ],
};

export default config;
