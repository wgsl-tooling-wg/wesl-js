import { glob } from "glob";
import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { WeslBundle } from "wesl";
import weslBundleDecl from "../../wesl/src/WeslBundle.ts?raw";
import { CliArgs } from "./packagerCli.js";

/** write weslBundle .js and .d.ts files for this shader */
export async function packageWgsl(args: CliArgs): Promise<void> {
  const { projectDir, outDir } = args;
  const modules = await loadModules(args);
  const pkgJsonPath = path.join(projectDir, "package.json");
  const { name } = await loadPackageFields(pkgJsonPath);
  const edition = "unstable_2025_1";

  await writeJsBundle({ name, edition, modules }, outDir);
  await writeTypeScriptDts(outDir);
}

/** Write weslBundle.d.ts containing the type definitions for a WeslBundle */
async function writeTypeScriptDts(outDir: string): Promise<void> {
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
  const shaderFiles = await glob(`${rootDir}/*.w[ge]sl`, {
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
