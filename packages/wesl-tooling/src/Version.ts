/** Read package.json from a directory.
 * @param projectDir - file:// URL string to directory containing package.json
 * @returns the parsed package.json contents */
export async function readPackageJson(
  projectDir: string,
): Promise<Record<string, any>> {
  const baseUrl = projectDir.endsWith("/") ? projectDir : `${projectDir}/`;
  const pkgJsonPath = new URL("package.json", baseUrl);
  const pkgModule = await import(pkgJsonPath.href, { with: { type: "json" } });
  return pkgModule.default;
}

/**
 * @param projectDir - file:// URL string to directory containing package.json
 * @returns the 'version' field from the package.json in the `projectDir`
 */
export async function versionFromPackageJson(
  projectDir: string,
): Promise<string> {
  const pkg = await readPackageJson(projectDir);
  return pkg.version;
}
