/**
 * @param projectDir - e.g., file:// URL of the directory containing package.json
 * @returns the 'version' field from the package.json in the `projectDir`
 */
export async function versionFromPackageJson(projectDir: URL): Promise<string> {
  const pkgJsonPath = new URL("./package.json", projectDir);
  const pkgModule = await import(pkgJsonPath.href, { with: { type: "json" } });
  const version = pkgModule.default.version;
  return version as string;
}
