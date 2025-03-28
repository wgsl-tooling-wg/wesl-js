import { unreachable } from "@std/assert";
import type {
  ImportCollection,
  ImportItem,
  ImportSegment,
  ImportStatement,
} from "./AbstractElems.ts";

export interface FlatImport {
  importPath: string[];
  modulePath: string[];
}

/**
 * Simplify importTree into a flattened map from import paths to module paths.
 *
 * @return map from import path (with 'as' renaming) to module Path
 */
export function flattenTreeImport(imp: ImportStatement): FlatImport[] {
  return recursiveResolve([], [], imp.segments, imp.finalSegment);

  /** recurse through segments of path, producing  */
  function recursiveResolve(
    resolvedImportPath: string[],
    resolvedExportPath: string[],
    remainingPath: ImportSegment[],
    finalSegment: ImportCollection | ImportItem,
  ): FlatImport[] {
    if (remainingPath.length > 0) {
      const [segment, ...rest] = remainingPath;
      const importPath = [...resolvedImportPath, segment.name];
      const modulePath = [...resolvedExportPath, segment.name];
      return recursiveResolve(importPath, modulePath, rest, finalSegment);
    } else if (finalSegment.kind === "import-collection") {
      // resolve path with each element in the list
      return finalSegment.subtrees.flatMap((elem) => {
        return recursiveResolve(
          resolvedImportPath,
          resolvedExportPath,
          elem.segments,
          elem.finalSegment,
        );
      });
    } else if (finalSegment.kind === "import-item") {
      const importPath = [
        ...resolvedImportPath,
        finalSegment.as ?? finalSegment.name,
      ];
      const modulePath = [...resolvedExportPath, finalSegment.name];
      return [{ importPath, modulePath }];
    } else {
      unreachable(finalSegment);
    }
  }
}
