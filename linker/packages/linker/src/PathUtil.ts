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
          throw new Error("Path escapes the root");
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
