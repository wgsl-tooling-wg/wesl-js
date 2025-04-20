import { build, BuildOptions, context, Plugin } from "esbuild";
import { readFile } from "node:fs/promises";
import * as path from "path";
import { parseArgs, ParseArgsConfig } from "node:util";

/* an esbuild script with a plugin to handle ?raw style imports */

const buildOptions: BuildOptions = {
  plugins: [raw()],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "bin/wesl-packager",
  entryPoints: ["src/main.ts"],
  logLevel: "info",
};

main();

async function main() {
  const opts = args();
  if (opts.watch) {
    await context(buildOptions).then(ctx => ctx.watch());
  } else {
    await build(buildOptions);
  }
}

function args(): Record<string, any> {
  const config: ParseArgsConfig = {
    options: {
      watch: {
        type: "boolean",
      },
    },
  };
  const args = parseArgs(config);
  return args.values;
}

/** Package resources as strings via ?raw */
function raw(): Plugin {
  return {
    name: "raw",
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, args => {
        return {
          path:
            path.isAbsolute(args.path) ?
              args.path
            : path.join(args.resolveDir, args.path),
          namespace: "raw-loader",
        };
      });
      build.onLoad(
        { filter: /\?raw$/, namespace: "raw-loader" },
        async args => {
          return {
            contents: await readFile(args.path.replace(/\?raw$/, "")),
            loader: "text",
          };
        },
      );
    },
  };
}
