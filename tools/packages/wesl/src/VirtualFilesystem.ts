import { assertThat } from "./Assertions.ts";
import { ModulePath } from "./Module.ts";
import { isIdent } from "./parse/WeslStream.ts";
import { normalize, noSuffix } from "./PathUtil.ts";

/** A async virtual filesystem, can be backed by an in-memory map, or by a real filesystem, or by HTTP requests */
export interface VirtualFilesystem {
  /**
   * The WESL module loading uses this to load files.
   */
  readFile(path: ModulePath): Promise<string | null>;

  debugFilePath(path: ModulePath): string;
}

/** Creates a static filesystem from relative, normalized, Linux-style paths.
 * All file and folder names must be valid WGSL identifiers.
 * `.wgsl` and `.wesl` are the supported file extensions.
 */
export function staticFilesystem(
  packageName: string,
  files: Record<string, string>,
): VirtualFilesystem {
  // Avoid accidentally having a file called `toString`
  const filesystemMap = new Map(
    Object.entries(files).map(([path, contents]) => [
      fileToModulePath(path, packageName),
      contents,
    ]),
  );
  function readFile(path: ModulePath): Promise<string | null> {
    const file = filesystemMap.get(path) ?? null;
    return Promise.resolve(file);
  }
  return {
    readFile,
    debugFilePath(path) {
      return path.path.join("/");
    },
  };
}

const fileNameRegex = /^(?<name>[^.]+)\.(?<extension>wgsl|wesl)$/;

const libRegex = /^lib\.w[eg]sl$/i;

/** convert a file path (./foo/bar.wesl)
 *  to a module path (package::foo::bar) */
function fileToModulePath(filePath: string, packageName: string): ModulePath {
  if (filePath.includes("::")) {
    // already a module path
    return new ModulePath(filePath.split("::"));
  }
  if (packageName !== "package" && libRegex.test(filePath)) {
    // special case for lib.wesl files in external packages
    return new ModulePath([packageName]);
  }

  const strippedPath = noSuffix(normalize(filePath));
  const moduleSuffix = strippedPath.split("/");
  return new ModulePath([packageName, ...moduleSuffix]);
}

// LATER: Replace the above with this more strict verson
function fileToModulePath2(path: string): ModulePath {
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

  return new ModulePath(segments);
}
