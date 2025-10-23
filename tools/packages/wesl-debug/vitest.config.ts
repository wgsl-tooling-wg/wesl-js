/// <reference types="vitest/config" />

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["src/test/**/*.test.ts"],
    reporters: [
      "default",
      [
        "vitest-image-snapshot/reporter",
        { reportPath: join(__dirname, "__image_diff_report__") },
      ],
    ],
  },
});
