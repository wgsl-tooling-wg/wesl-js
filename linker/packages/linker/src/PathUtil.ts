/** A relative path, without any `.` or `..` parts.  */
export class RelativePath {
  private constructor(public components: readonly string[]) {}

  /** Parses a relative path into its components. Mostly follows [the Rust conventions](https://doc.rust-lang.org/std/path/struct.Path.html#method.components) for normalization and does
   * - Ignoring repeated separators
   * - Remove all dots, including the ones at the beginning of a path (diverges from Rust)
   * - Remove trailing slash
   * - Normalizes "a/b/../c" to "a/c", because it does not attempt to deal with symbolic links
   */
  static parse(path: string): RelativePath {
    if (path.startsWith("/")) {
      throw new Error("Absolute paths are not supported");
    }
    const result: string[] = [];
    path.split("/").forEach(part => {
      if (part === "") {
        // Ignore repeated separators and ignore trailing slash
      } else if (part === ".") {
        // Remove all dots
      } else if (part === "..") {
        if (result.length > 0) {
          result.pop();
        } else {
          throw new Error(`Path ${path} escapes the root`);
        }
      } else {
        result.push(part);
      }
    });

    return new RelativePath(result);
  }

  stripPrefix(base: RelativePath): RelativePath {
    if (base.components.length > this.components.length) {
      throw new Error(
        `Cannot strip ${base.toString()} from ${this.toString()}`,
      );
    }
    for (let i = 0; i < base.components.length; i++) {
      if (base.components[i] !== this.components[i]) {
        throw new Error(
          `Cannot strip ${base.toString()} from ${this.toString()}, because ${base.components[i]} does not match ${this.components[i]}`,
        );
      }
    }
    return new RelativePath(this.components.slice(base.components.length));
  }

  toString(): string {
    return this.components.join("/");
  }
}

/** simplistic path manipulation utilities */

export function relativePath(
  srcPath: string | undefined,
  reqPath: string,
): string {
  if (!srcPath) return reqPath;
  const srcDir = dirname(srcPath);
  const relative = join(srcDir, reqPath);
  return relative;
}

export function dirname(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return ".";
  return path.slice(0, lastSlash);
}

export function join(a: string, b: string): string {
  const joined = b.startsWith("/") ? a + b : a + "/" + b;
  return normalize(joined);
}

/** return path with ./ and foo/.. elements removed */
export function normalize(path: string): string {
  const segments = path.split("/");
  const noDots = segments.filter(s => s !== ".");
  const noDbl: string[] = [];

  noDots.forEach(s => {
    if (s !== "") {
      if (s === ".." && noDbl.length && noDbl[noDbl.length - 1] !== "..") {
        noDbl.pop();
      } else {
        noDbl.push(s);
      }
    }
  });

  return noDbl.join("/");
}

/** return path w/o a suffix.
 * e.g. /foo/bar.wgsl => /foo/bar */
export function noSuffix(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  const lastStart = lastSlash === -1 ? 0 : lastSlash + 1;

  const suffix = path.indexOf(".", lastStart);
  const suffixStart = suffix === -1 ? path.length : suffix;
  return path.slice(0, suffixStart);
}
