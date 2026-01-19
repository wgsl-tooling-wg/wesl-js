import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "dist/test/**/*.test.cjs",
  version: "stable",
  mocha: {
    timeout: 20000,
  },
  launchArgs: [
    "--disable-workspace-trust",
    // Position window in corner (x=0, y=0) with small size to minimize disruption
    "--window-position=0,0",
    "--window-size=800,600",
  ],
});
