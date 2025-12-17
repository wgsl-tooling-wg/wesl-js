/** WESL module path utilities for converting between :: and / separators. */

/**
 * Convert module path segments to relative file path.
 * Handles package/packageName prefixes and super:: resolution.
 *
 * @param parts - module path as array e.g., ["package", "utils", "helper"]
 * @param packageName - the current package's name (required)
 * @param srcModuleParts - source module path for super:: resolution (optional)
 * @returns relative file path e.g., "utils/helper", or undefined if external
 */
export function modulePartsToRelativePath(
  parts: string[],
  packageName: string,
  srcModuleParts?: string[],
): string | undefined {
  const resolved = srcModuleParts ? resolveSuper(parts, srcModuleParts) : parts;

  const rootSegment = resolved[0];
  if (rootSegment === "package" || rootSegment === packageName) {
    return resolved.slice(1).join("/");
  }
  return undefined;
}

/** String variant of modulePartsToRelativePath. */
export function moduleToRelativePath(
  modulePath: string,
  packageName: string,
  srcModulePath?: string,
): string | undefined {
  const srcParts = srcModulePath?.split("::");
  const parts = modulePath.split("::");
  return modulePartsToRelativePath(parts, packageName, srcParts);
}

/**
 * Resolve super:: elements to absolute module path.
 *
 * @param parts - module path with potential super:: elements
 * @param srcModuleParts - source module path for context
 * @returns absolute module path parts (no super:: elements)
 */
export function resolveSuper(
  parts: string[],
  srcModuleParts: string[],
): string[] {
  const lastSuper = parts.lastIndexOf("super");
  if (lastSuper === -1) return parts;
  const base = srcModuleParts.slice(0, -(lastSuper + 1));
  return [...base, ...parts.slice(lastSuper + 1)];
}

/** Normalize debug root to end with / or be empty. */
export function normalizeDebugRoot(root?: string): string {
  if (root === undefined) return "./";
  if (root === "") return "";
  return root.endsWith("/") ? root : root + "/";
}
