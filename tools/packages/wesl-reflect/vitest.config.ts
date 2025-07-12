/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { UserConfig } from "vite";
import viteWesl from "../wesl-plugin/src/plugins/vite.ts";
import { simpleReflect } from "./src/SimpleReflectExtension.ts";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");
const typesDir = path.join(path.dirname(thisPath), "generated/types");

const config: UserConfig = {
  plugins: [
    viteWesl({
      weslToml,
      extensions: [simpleReflect({ typesDir })],
    }),
  ],
};

export default config;
