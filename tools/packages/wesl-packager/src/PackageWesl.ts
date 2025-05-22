/// <reference types="vite/client" />
import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { Biome, Distribution } from "@biomejs/js-api";
import { type WeslBundle, noSuffix } from "wesl";
import { loadModules, parseDependencies, zip } from "wesl-tooling";
import weslBundleDecl from "../../wesl/src/WeslBundle.ts?raw";
import type { CliArgs } from "./PackagerCli.ts";

const biome = await setupBiome();

/** write weslBundle .js and .d.ts files for this shader */
export async function packageWgsl(args: CliArgs): Promise<void> {
  const { projectDir, outDir, multiBundle, baseDir, src } = args;
  const modules = await loadModules(baseDir, src);
  if (Object.entries(modules).length === 0) {
    console.error("no WGSL/WESL files found in", args.src);
    throw new Error("no WGSL/WESL files found");
  }
  const pkgJsonPath = path.join(projectDir, "package.json");
  const { name } = await loadPackageFields(pkgJsonPath);
  const edition = "unstable_2025_1";

  if (args.multiBundle) {
    await writeMultiBundle(modules, name, edition, projectDir, outDir);
  } else {
    const deps = parseDependencies(modules, projectDir);
    await writeJsBundle({ name, edition, modules }, deps, outDir);
  }
  await writeTypeScriptDts(outDir);
  if (args.updatePackageJson) {
    await updatePackageJson(projectDir, outDir, multiBundle);
  }
}

/** add an 'exports' entry to package.json for the wesl bundles */
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
  const jsonString = JSON.stringify(pkgJson, null, 2).concat("\n");
  await fs.writeFile(pkgJsonPath, jsonString);
}

/** create one bundle per source module */
async function writeMultiBundle(
  modules: Record<string, string>,
  name: string,
  edition: string,
  projectDir: string,
  outDir: string,
): Promise<void> {
  for (const [moduleName, moduleSrc] of Object.entries(modules)) {
    const oneModule = { [moduleName]: moduleSrc };
    const moduleBundle: WeslBundle = {
      name,
      edition,
      modules: oneModule,
    };
    const dependencies = parseDependencies(oneModule, projectDir);
    const bundleDirRelative = noSuffix(moduleName);
    const bundleDir = path.join(outDir, bundleDirRelative);
    await writeJsBundle(moduleBundle, dependencies, bundleDir);
  }
}

/** Write a weslBundle.js containing the bundled shader sources */
async function writeJsBundle(
  weslBundle: WeslBundle,
  dependencies: string[],
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });

  const depNames = dependencies.map(dep => dep.replaceAll("/", "_"));
  const depsWithNames = zip(dependencies, depNames);

  const imports = depsWithNames
    .map(([dep, depName]) => {
      return `import ${depName} from "${dep}";`;
    })
    .join("\n");
  const importsStr = imports ? `${imports}\n` : "";

  const bundleString = bundleToJsString(weslBundle, depNames);

  const outString = `
    ${importsStr}
    export const weslBundle = ${bundleString}

    export default weslBundle;
  `;

  const outPath = path.join(outDir, "weslBundle.js");
  const formatted = biome.formatContent(outString, { filePath: "b.js" });
  await fs.writeFile(outPath, formatted.content);
}

/** Write weslBundle.d.ts containing the type definitions for a WeslBundle */
async function writeTypeScriptDts(outDir: string): Promise<void> {
  // TODO could we use /// <reference types="wesl"> to get the type of WeslBundle?
  const constDecl = `
    export declare const weslBundle: WeslBundle;
    export default weslBundle;
  `;
  const declText = weslBundleDecl + constDecl;
  const formatted = biome.formatContent(declText, { filePath: "t.d.ts" });

  const outPath = path.join(outDir, "weslBundle.d.ts");
  await fs.writeFile(outPath, formatted.content);
}

/** @return the bundle plus dependencies as a JavaScript string */
function bundleToJsString(bundle: WeslBundle, dependencies: string[]): string {
  const { name, edition, modules } = bundle;
  const depsObj = dependencies.length ? { dependencies: 99 } : {};
  const obj = { name, edition, modules, ...depsObj };
  const jsonString = JSON.stringify(obj, null, 2);
  if (dependencies.length) {
    const dependenciesStr = `: [${dependencies.join(", ")}]`;
    const result = jsonString.replace(": 99", dependenciesStr);
    return result;
  } else {
    return jsonString;
  }
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

/** setup biome to use as a formatter */
async function setupBiome(): Promise<Biome> {
  const biome = await Biome.create({
    distribution: Distribution.NODE,
  });
  biome.applyConfiguration({
    formatter: { indentStyle: "space" },
  });
  return biome;
}
