/// <reference types="vitest/config" />
import { UserConfig } from 'vite';
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from 'wesl-plugin/vite';
import inspect from 'vite-plugin-inspect'


const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl(),
    inspect()
  ],
};

export default config;
