/** CLI to quickly open a local WESL/WGSL file in a browser-based CodeMirror editor. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { createServer, type ViteDevServer } from "vite";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface CliArgs {
  file: string;
  port: number;
  open: boolean;
}

export async function cli(rawArgs: string[]): Promise<void> {
  const argv = await parseArgs(rawArgs);
  await startDevServer(argv);
}

async function parseArgs(args: string[]): Promise<CliArgs> {
  const argv = await yargs(args)
    .command("$0 <file>", "Edit a WESL/WGSL file in the browser", yargs => {
      yargs.positional("file", {
        type: "string",
        describe: "Path to WESL/WGSL file to edit",
        demandOption: true,
      });
    })
    .option("port", {
      alias: "p",
      type: "number",
      default: 5173,
      describe: "Dev server port",
    })
    .option("open", {
      type: "boolean",
      default: true,
      describe: "Open browser automatically",
    })
    .help()
    .parse();
  return argv as unknown as CliArgs;
}

async function startDevServer(argv: CliArgs): Promise<void> {
  const filePath = path.resolve(argv.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const packageDir = path.dirname(fileURLToPath(import.meta.url));
  const html = generateHtml(filePath);

  const server = await createServer({
    root: packageDir,
    server: { port: argv.port },
    plugins: [
      {
        name: "wgsl-edit-serve",
        configureServer(server: ViteDevServer) {
          server.middlewares.use((req, res, next) => {
            if (req.url === "/" || req.url === "/index.html") {
              res.setHeader("Content-Type", "text/html");
              res.end(html);
              return;
            }
            if (req.url === "/__file__") {
              res.setHeader("Content-Type", "text/plain");
              res.end(fs.readFileSync(filePath, "utf-8"));
              return;
            }
            next();
          });
        },
      },
    ],
  });

  await server.listen();
  const url = `http://localhost:${argv.port}`;
  console.log(`Editing: ${filePath}`);
  console.log(`Server:  ${url}`);

  if (argv.open) await open(url);
}

function generateHtml(filePath: string): string {
  const fileName = path.basename(filePath);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - wgsl-edit</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; background: #1e1e1e; }
    header { padding: 8px 16px; background: #252526; color: #ccc; font-family: system-ui; border-bottom: 1px solid #444; }
    wgsl-edit { flex: 1; }
  </style>
</head>
<body>
  <header>${fileName}</header>
  <wgsl-edit src="/__file__"></wgsl-edit>
  <script type="module">
    import "wgsl-edit";
  </script>
</body>
</html>`;
}

cli(hideBin(process.argv));
