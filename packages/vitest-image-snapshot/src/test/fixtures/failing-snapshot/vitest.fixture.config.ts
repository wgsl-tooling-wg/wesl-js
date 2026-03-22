/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { ImageSnapshotReporter } from "../../../ImageSnapshotReporter.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    reporters: [
      "default",
      new ImageSnapshotReporter({
        reportPath: path.join(__dirname, "__image_diff_report__"),
        autoOpen: "never",
        port: 0,
      }),
    ],
  },
});
