/**
 * An import statement, which is tree shaped.
 * `import foo::bar::{baz, cat as neko};
 */
export class ImportStatement {
  constructor(
    public segments: ImportSegment[],
    public finalSegment: ImportCollection | ImportItem,
  ) {}
}

/**
 * A collection of import trees.
 * `{baz, cat as neko}`
 */
export class ImportCollection {
  constructor(public subTrees: ImportStatement[]) {}
}

/**
 * A primitive segment in an import statement.
 * `foo`
 */
export class ImportSegment {
  constructor(public name: string) {}
}

/** Stop Typescript from accepting ImportItems wherever ImportSegments are required */
const itemSymbol: unique symbol = Symbol("item");

/**
 * A renamed item at the end of an import statement.
 * `cat as neko`
 */
export class ImportItem {
  constructor(
    public name: string,
    public as?: string,
  ) {}

  [itemSymbol]: undefined;
}
