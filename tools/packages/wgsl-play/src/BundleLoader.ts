import { gunzipSync } from "fflate";
import { type ParsedTarFileItem, parseTar } from "nanotar";
import type { WeslBundle } from "wesl";
import { loadBundlesFromFiles, type WeslBundleFile } from "./BundleHydrator.ts";

/** Fetch bundle files from an npm package (without evaluating). */
export async function fetchBundleFilesFromNpm(
  packageName: string,
): Promise<WeslBundleFile[]> {
  const tgzUrl = await npmPackageToUrl(packageName);
  return fetchBundleFilesFromUrl(tgzUrl);
}

/** Load bundles from URL or npm package name, return bundles, package name, and resolved tgz URL. */
export async function loadBundlesWithPackageName(
  input: string,
): Promise<{ bundles: WeslBundle[]; packageName: string; tgzUrl: string }> {
  const tgzUrl = await resolvePackageInput(input);
  const entries = await fetchAndExtractTgz(tgzUrl);

  const bundleFilesWithoutPackage = entries
    .filter(isBundleFile)
    .map(f => ({ packagePath: f.name, content: f.text }));

  if (bundleFilesWithoutPackage.length === 0) {
    throw new Error("No bundle files found in package");
  }

  const packageName = extractPackageName(bundleFilesWithoutPackage[0].content);
  const bundleFiles: WeslBundleFile[] = bundleFilesWithoutPackage.map(f => ({
    ...f,
    packageName,
  }));
  const bundles = await loadBundlesFromFiles(bundleFiles);

  return { bundles, packageName, tgzUrl };
}

/** Load WESL bundles from a tgz URL.
 * (handy for privately published packages) */
export async function loadBundlesFromTgz(
  tgzUrl: string,
  packageName: string,
): Promise<WeslBundle[]> {
  const entries = await fetchAndExtractTgz(tgzUrl);
  const bundleFiles: WeslBundleFile[] = entries
    .filter(isBundleFile)
    .map(f => ({ packagePath: f.name, content: f.text, packageName }));

  return loadBundlesFromFiles(bundleFiles);
}

/** Resolve input to a tgz URL (converts npm package names to registry URLs). */
async function resolvePackageInput(input: string): Promise<string> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  return npmPackageToUrl(input);
}

/** Extract package name from bundle file content. */
function extractPackageName(bundleContent: string): string {
  const nameMatch = bundleContent.match(/name:\s*"([^"]+)"/);
  if (!nameMatch) {
    throw new Error("Could not extract package name from bundle");
  }
  return nameMatch[1];
}

/** Fetch and extract tgz file, returning tar entries. */
async function fetchAndExtractTgz(
  tgzUrl: string,
): Promise<ParsedTarFileItem[]> {
  const response = await fetch(tgzUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch package: HTTP ${response.status}`);
  }
  const gzipData = new Uint8Array(await response.arrayBuffer());
  const tarData = gunzipSync(gzipData);
  return parseTar(tarData);
}

/** Fetch bundle files from a tgz URL (without evaluating). */
async function fetchBundleFilesFromUrl(
  tgzUrl: string,
): Promise<WeslBundleFile[]> {
  const entries = await fetchAndExtractTgz(tgzUrl);
  const bundleFilesWithoutPkg = entries
    .filter(isBundleFile)
    .map(f => ({ packagePath: f.name, content: f.text }));

  if (bundleFilesWithoutPkg.length === 0) return [];

  const pkgName = extractPackageName(bundleFilesWithoutPkg[0].content);
  return bundleFilesWithoutPkg.map(f => ({ ...f, packageName: pkgName }));
}

/** Fetch npm package tarball URL from registry metadata. */
async function npmPackageToUrl(packageName: string): Promise<string> {
  const metadataUrl = `https://registry.npmjs.org/${packageName}`;
  const response = await fetch(metadataUrl);
  if (!response.ok) {
    throw new Error(`Package not found in npm registry: ${packageName}`);
  }
  const metadata = await response.json();
  const latestVersion = metadata["dist-tags"]?.latest;
  if (!latestVersion) {
    throw new Error(`No latest version found for package: ${packageName}`);
  }
  const tarballUrl = metadata.versions?.[latestVersion]?.dist?.tarball;
  if (!tarballUrl) {
    throw new Error(`No tarball URL found for ${packageName}@${latestVersion}`);
  }
  return tarballUrl;
}

/** Check if tar entry is a WESL bundle file. Bundles must be in dist/ to avoid loading source files. */
function isBundleFile(entry: ParsedTarFileItem): boolean {
  return entry.name.endsWith("weslBundle.js") && entry.name.includes("/dist/");
}
