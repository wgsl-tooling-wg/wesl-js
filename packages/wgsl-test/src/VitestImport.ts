/** Dynamically import vitest with helpful error if not installed. */
export async function importVitest(): Promise<typeof import("vitest")> {
  try {
    return await import("vitest");
  } catch {
    throw new Error(
      "This function requires vitest. Use framework-agnostic APIs like testWesl() or testFragment() instead.",
    );
  }
}

/** Dynamically import vitest-image-snapshot with helpful error if not installed. */
export async function importImageSnapshot(): Promise<
  typeof import("vitest-image-snapshot")
> {
  try {
    return await import("vitest-image-snapshot");
  } catch {
    throw new Error(
      "This function requires vitest-image-snapshot. Use testFragmentImage() for framework-agnostic testing.",
    );
  }
}
