/** @returns the version from the package.json in the provided directory */
export async function versionFromPackageJson(
  projectDir: string,
): Promise<string> {
  const pkgJsonPath = new URL("./package.json", projectDir);
  const pkgModule = await import(pkgJsonPath.href, { with: { type: "json" } });
  const version = pkgModule.default.version;
  return version as string;
}
