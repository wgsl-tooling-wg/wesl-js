/// <reference types="vitest/config" />
import { UserConfig } from 'vite';
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from 'wesl-plugin/vite';


const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl(),
  ],
};

export default config;
