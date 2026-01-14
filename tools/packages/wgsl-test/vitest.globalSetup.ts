import { execSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Build weslBundle.js before tests run so tests don't require manual build step. */
export default function setup() {
  execSync("pnpm wesl-packager", { cwd: __dirname, stdio: "inherit" });
}
