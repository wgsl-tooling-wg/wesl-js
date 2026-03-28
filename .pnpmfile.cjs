const path = require("path");
const { execSync } = require("child_process");

/** Get the main repo root (not the worktree root). */
function repoRoot() {
  const gitCommonDir = execSync("git rev-parse --path-format=absolute --git-common-dir", {
    encoding: "utf-8",
    cwd: __dirname,
  }).trim();
  return path.dirname(gitCommonDir);
}

function readPackage(pkg) {
  if (process.env.LOCAL_DEPS) {
    const benchforge =
      process.env.LOCAL_DEPS === "1"
        ? path.resolve(repoRoot(), "../benchforge")
        : path.resolve(process.env.LOCAL_DEPS);
    pkg.dependencies = {
      ...pkg.dependencies,
      benchforge: `link:${benchforge}`,
    };
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
