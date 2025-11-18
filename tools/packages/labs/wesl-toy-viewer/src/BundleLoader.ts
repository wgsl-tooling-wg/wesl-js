import { gunzipSync } from "fflate";
import { parseTar } from "nanotar";
import type { WeslBundle } from "wesl";
import type { BundleFile } from "./BundleEvaluator.ts";
import { loadBundlesFromFiles } from "./BundleEvaluator.ts";

/** Load and extract WESL bundles from tgz archives (URLs or npm packages). */

/** Shader metadata for @toy-annotated shaders in the viewer dropdown. */
export interface ToyShaderInfo {
  /** Human-readable name displayed in the UI dropdown. */
  displayName: string;

  /** File path in the bundle (e.g., "test/shaders/draw-shapes.wesl"). */
  filePath: string;
}

/** Load bundles from URL or npm package name, return bundles, package name, and resolved tgz URL. */
export async function loadBundlesWithPackageName(
  input: string,
): Promise<{ bundles: WeslBundle[]; packageName: string; tgzUrl: string }> {
  const tgzUrl = await resolvePackageInput(input);
  const entries = await fetchAndExtractTgz(tgzUrl);

  const bundleFilesWithoutPackage = entries
    .filter(f => f.name.endsWith("weslBundle.js"))
    .map(f => ({ name: f.name, content: f.text }));

  if (bundleFilesWithoutPackage.length === 0) {
    throw new Error("No bundle files found in package");
  }

  const packageName = extractPackageName(bundleFilesWithoutPackage[0].content);
  const bundleFiles: BundleFile[] = bundleFilesWithoutPackage.map(f => ({
    ...f,
    packageName,
  }));
  const bundles = await loadBundlesFromFiles(bundleFiles);

  return { bundles, packageName, tgzUrl };
}

/** Load WESL bundles from a tgz URL. */
export async function loadBundlesFromTgz(
  tgzUrl: string,
  packageName: string,
): Promise<WeslBundle[]> {
  const entries = await fetchAndExtractTgz(tgzUrl);
  const bundleFiles: BundleFile[] = entries
    .filter(f => f.name.endsWith("weslBundle.js"))
    .map(f => ({ name: f.name, content: f.text, packageName }));

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
async function fetchAndExtractTgz(tgzUrl: string) {
  const response = await fetch(tgzUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch package: HTTP ${response.status}`);
  }
  const gzipData = new Uint8Array(await response.arrayBuffer());
  const tarData = gunzipSync(gzipData);
  return parseTar(tarData);
}

/** Fetch npm package tarball URL from registry metadata. */
async function npmPackageToUrl(packageName: string): Promise<string> {
  // LATER: support version specifiers (e.g., "lygia@1.2.3")
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
