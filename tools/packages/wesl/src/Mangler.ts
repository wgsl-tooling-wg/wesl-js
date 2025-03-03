/**
 * A function for constructing a unique identifier name for a global declaration.
 * Global names must be unique in the linked wgsl.
 *
 * Three manglers are currently available:
 * . minimalMangle preserves original source names where possible
 * . underscoreMangle constructs long but predictable names for every declaration
 * . lengthPrefixMangle constructs long but predictable names for every declaration
 */
export type ManglerFn = (
  /** global declaration that needs a name */
  decl: string,

  /** module that contains the declaration */
  modulePath: string[],

  /** current set of mangled root level names for the linked result (read only) */
  globalNames: Set<string>,
) => string;

/**
 * Construct a globally unique name based on the declaration
 * module path separated by underscores.
 * Corresponds to "Underscore-count mangling" from [NameMangling.md](https://github.com/wgsl-tooling-wg/wesl-spec/blob/main/NameMangling.md)
 */
export function underscoreMangle(decl: string, modulePath: string[]): string {
  return [...modulePath, decl]
    .map(v => {
      const underscoreCount = (v.match(/_/g) ?? []).length;
      if (underscoreCount > 0) {
        return "_" + underscoreCount + v;
      } else {
        return v;
      }
    })
    .join("_");
}

/**
 * Construct a globally unique name based on the declaration
 */
export function lengthPrefixMangle(decl: string, modulePath: string[]): string {
  function codepointCount(text: string): number {
    return [...text].length;
  }
  const qualifiedIdent = [...modulePath, decl];
  return "_" + qualifiedIdent.map(v => codepointCount(v) + v).join("");
}

/**
 * ManglerFn to construct a globally unique name
 * using the requested name plus a uniquing number suffix if necessary
 */
export function minimalMangle(
  decl: string,
  _modulePath: string[],
  globalNames: Set<string>,
): string {
  return minimallyMangledName(decl, globalNames);
}

/**
 * Construct a globally unique name by using the requested name if possible
 * and appending a number suffix necessary
 */
export function minimallyMangledName(
  name: string,
  globalNames: Set<string>,
): string {
  let renamed = name;
  let conflicts = 0;

  // create a unique name
  while (globalNames.has(renamed)) {
    renamed = name + conflicts++;
  }

  return renamed;
}
