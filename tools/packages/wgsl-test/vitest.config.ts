/// <reference types="vitest/config" />

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Skip all GPU tests on Windows CI (software renderer issues)
const isWindowsCI = process.platform === "win32" && process.env.CI === "true";

export default defineConfig({
  test: {
    include: isWindowsCI ? [] : ["src/test/**/*.test.ts"],
    reporters: [
      "default",
      [
        "vitest-image-snapshot/reporter",
        // configure path explicitly to get same location from monorepo
        { reportPath: join(__dirname, "__image_diff_report__") },
      ],
    ],
  },
});
