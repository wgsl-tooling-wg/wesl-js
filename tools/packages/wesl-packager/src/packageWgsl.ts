/// <reference types="vite/client" />
import { glob } from "glob";
import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { noSuffix, WeslBundle } from "wesl";
import weslBundleDecl from "../../wesl/src/WeslBundle.ts?raw";
import { CliArgs } from "./packagerCli.js";
import { dlog } from "berry-pretty";

/** write weslBundle .js and .d.ts files for this shader */
export async function packageWgsl(args: CliArgs): Promise<void> {
  const { projectDir, outDir, multiBundle } = args;
  const modules = await loadModules(args);
  if (Object.entries(modules).length === 0) {
    console.error("no WGSL/WESL files found in", args.src);
    throw new Error("no WGSL/WESL files found");
  }
  const pkgJsonPath = path.join(projectDir, "package.json");
  const { name } = await loadPackageFields(pkgJsonPath);
  const edition = "unstable_2025_1";

  if (!args.multiBundle) {
    await writeJsBundle({ name, edition, modules }, outDir);
  } else {
    await writeMultiBundle(modules, name, edition, outDir);
  }
  await writeTypeScriptDts(outDir);
  if (args.updatePackageJson) {
    await updatePackageJson(projectDir, outDir, multiBundle);
  }
}

async function updatePackageJson(
  projectDir: string,
  outDir: string,
  multiBundle: boolean,
): Promise<void> {
  const pkgJsonPath = path.join(projectDir, "package.json");
  const pkgJsonString = await fs.readFile(pkgJsonPath, { encoding: "utf8" });
  const pkgJson = JSON.parse(pkgJsonString);
  const exports: Record<string, any> = {};

  const distDir = path.relative(projectDir, outDir);
  if (multiBundle) {
    exports["./*"] = {
      import: `./${distDir}/*/weslBundle.js`,
      types: `./${distDir}/weslBundle.d.ts`,
    };
  } else {
    exports["."] = {
      import: `./${distDir}/weslBundle.js`,
      types: `./${distDir}/weslBundle.d.ts`,
    };
  }

  pkgJson.exports = exports;
  await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
}

async function writeMultiBundle(
  modules: Record<string, string>,
  name: string,
  edition: string,
  outDir: string,
): Promise<void> {
  for (const [moduleName, moduleSrc] of Object.entries(modules)) {
    const moduleBundle: WeslBundle = {
      name,
      edition,
      modules: { [moduleName]: moduleSrc },
    };
    const bundleDirRelative = noSuffix(moduleName);
    const bundleDir = path.join(outDir, bundleDirRelative);
    await writeJsBundle(moduleBundle, bundleDir);
  }
}

/** Write weslBundle.d.ts containing the type definitions for a WeslBundle */
async function writeTypeScriptDts(outDir: string): Promise<void> {
  // TODO could we use /// <reference types="wesl"> to get the type of WeslBundle?
  const constDecl = `
export declare const weslBundle: WeslBundle;
export default weslBundle;
`;
  const declText = weslBundleDecl + constDecl;
  const outPath = path.join(outDir, "weslBundle.d.ts");
  await fs.writeFile(outPath, declText);
}

/** Write weslBundle.js containing the bundled shader sources */
async function writeJsBundle(
  weslBundle: WeslBundle,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });

  const bundleString = JSON.stringify(weslBundle, null, 2);
  const outString = `
export const weslBundle = ${bundleString}

export default weslBundle;
  `;
  const outPath = path.join(outDir, "weslBundle.js");
  await fs.writeFile(outPath, outString);
}

/** load the wesl/wgsl shader sources */
async function loadModules(args: CliArgs): Promise<Record<string, string>> {
  const { rootDir } = args;
  const shaderFiles = await glob(`${args.src}`, {
    ignore: "node_modules/**",
  });
  const promisedSrcs = shaderFiles.map(f =>
    fs.readFile(f, { encoding: "utf8" }),
  );
  const src = await Promise.all(promisedSrcs);
  const relativePaths = shaderFiles.map(p => path.relative(rootDir, p));
  const moduleEntries = zip(relativePaths, src);
  return Object.fromEntries(moduleEntries);
}

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, i) => [a, bs[i]]);
}

interface PkgFields {
  name: string;
}

/** parse and extract fields from package.json that we care about
 * (the name of the package) */
async function loadPackageFields(pkgJsonPath: string): Promise<PkgFields> {
  const pkgJsonString = await fs.readFile(pkgJsonPath, { encoding: "utf8" });
  const pkgJson = JSON.parse(pkgJsonString);
  const { name } = pkgJson;
  verifyField("name", name);

  function verifyField(field: string, value: any): void {
    if (value === undefined) {
      console.error(`no '${field}' field found in "${pkgJsonPath}"`);
      throw new Error("package.json incomplete");
    }
  }
  return { name };
}
