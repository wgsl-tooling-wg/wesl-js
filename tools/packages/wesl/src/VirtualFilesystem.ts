import { assertThat } from "./Assertions";
import { isIdent } from "./parse/WeslStream";

/**
 * A relative, normalized, Linux-style path ending with a file.
 * All file and folder names must be valid WGSL identifiers.
 * `.wgsl` and `.wesl` are the supported file extensions.
 */
export type WeslPath = string & { __weslPath: never };

/** A async virtual filesystem, can be backed by an in-memory map, or by a real filesystem, or by HTTP requests */
export interface VirtualFilesystem {
  /**
   * The WESL module loading uses this to load files.
   */
  readFile(path: WeslPath): Promise<string | null>;
}

/** Creates a static filesystem from relative, normalized, Linux-style paths.
 * All file and folder names must be valid WGSL identifiers.
 * `.wgsl` and `.wesl` are the supported file extensions.
 */
export function staticFilesystem(
  files: Record<string, string>,
): VirtualFilesystem {
  // Avoid accidentally having a file called `toString`
  const filesystemMap = new Map(
    Object.entries(files).map(([path, contents]) => [
      makeWeslPath(path),
      contents,
    ]),
  );
  function readFile(path: WeslPath): Promise<string | null> {
    const file = filesystemMap.get(path) ?? null;
    return Promise.resolve(file);
  }
  return {
    readFile,
  };
}

const fileNameRegex = /^(?<name>[^.]+)\.(?<extension>wgsl|wesl)$/;

export function makeWeslPath(path: string): WeslPath {
  if (path.startsWith("/")) {
    throw new Error(
      `Paths must be relative, but absolute path was found ${path}`,
    );
  }
  if (path.includes("\\")) {
    throw new Error(`Paths must be Linux-style, but \\ was found ${path}`);
  }
  if (path.includes("..")) {
    throw new Error(`Paths must be normalized, but .. was found ${path}`);
  }

  const segments = path.split("/");
  if (segments[0] === ".") {
    segments.shift();
  }
  const lastSegment = segments.pop();
  if (lastSegment === undefined) {
    throw new Error(`Path is missing a file name ${path}`);
  } else {
    const matches = lastSegment.match(fileNameRegex);
    if (matches === null) {
      throw new Error(
        `Expected a valid file name, but ${lastSegment} is not one ${path}`,
      );
    }
    assertThat(matches.groups !== undefined);
    const { name } = matches.groups;
    if (!isIdent(name)) {
      throw new Error(
        `Path must only contain valid WGSL idents, but ${name} is not one ${path}`,
      );
    }
  }

  for (const segment of segments) {
    if (!isIdent(segment)) {
      throw new Error(
        `Path must only contain valid WGSL idents, but ${segment} is not one ${path}`,
      );
    }
  }

  return path as WeslPath;
}
