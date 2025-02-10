import {
  ImportCollection,
  ImportItem,
  ImportStatement,
} from "./parse/AbstractElems";
import { assertThat, assertUnreachable } from "./Assertions";
import { isWgslIdent } from "./parse/WeslStream";

export interface FlatImport {
  importPath: ModulePath;
  modulePath: ModulePath;
}

/** A module path. Starts with `package` or with a library name. */
export type ModulePath = string[] & { __modulePath: never };
export function makeModulePath(value: string[]): ModulePath {
  assertThat(value.length > 0, "Module path cannot be empty");
  if (value[0] === "package") {
    // It's fine
  } else {
    assertThat(
      isWgslIdent(value[0]),
      `${value.join("::")} does not start with a valid WGSL ident`,
    );
  }
  for (let i = 1; i < value.length; i++) {
    assertThat(
      isWgslIdent(value[i]),
      `${value.join("::")} is not a valid WESL module path because of ${value[i]}`,
    );
  }
  return value as ModulePath;
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
    remainingPath: string[],
    finalSegment: ImportCollection | ImportItem,
  ): FlatImport[] {
    if (remainingPath.length > 0) {
      const [segment, ...rest] = remainingPath;
      const importPath = [...resolvedImportPath, segment];
      const modulePath = [...resolvedExportPath, segment];
      return recursiveResolve(importPath, modulePath, rest, finalSegment);
    } else if (finalSegment.kind === "import-collection") {
      // resolve path with each element in the list
      return finalSegment.subtrees.flatMap(elem => {
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
      return [
        {
          importPath: makeModulePath(importPath),
          modulePath: makeModulePath(modulePath),
        },
      ];
    } else {
      assertUnreachable(finalSegment);
    }
  }
}
