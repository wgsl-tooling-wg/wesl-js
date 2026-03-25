const path = require("path");

function readPackage(pkg) {
  if (process.env.LOCAL_DEPS) {
    const benchforge =
      process.env.LOCAL_DEPS === "1"
        ? path.resolve(__dirname, "../benchforge")
        : path.resolve(process.env.LOCAL_DEPS);
    pkg.dependencies = {
      ...pkg.dependencies,
      benchforge: `link:${benchforge}`,
    };
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
