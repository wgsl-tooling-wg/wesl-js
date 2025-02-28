import { Span } from "mini-parse";
import { AttributeElem } from "./WeslElems.ts";

/** Holds an import statement, and has a span */
export interface ImportElem {
  kind: "import";
  attributes: AttributeElem[];
  imports: ImportStatement;
  span: Span;
}

/**
 * An import statement, which is tree shaped.
 * `import foo::bar::{baz, cat as neko};
 */
export interface ImportStatement {
  kind: "import-statement";
  segments: ImportSegment[];
  finalSegment: ImportCollection | ImportItem;
}

/**
 * A collection of import trees.
 * `{baz, cat as neko}`
 */
export interface ImportSegment {
  kind: "import-segment";
  name: string;
}

/**
 * A primitive segment in an import statement.
 * `foo`
 */
export interface ImportCollection {
  kind: "import-collection";
  subtrees: ImportStatement[];
}

/**
 * A renamed item at the end of an import statement.
 * `cat as neko`
 */
export interface ImportItem {
  kind: "import-item";
  name: string;
  as?: string;
}
