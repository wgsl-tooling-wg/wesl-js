/**
 * Find the dependencies in a set of WESL files
 * (useful for packaging WESL files into a library)
 *
 * Parse the WESL files and partially bind the identifiers,
 * returning any identifiers that are not succesfully bound.
 * Those identifiers are the package dependencies.
 *
 * The dependency might be a default export bundle or
 * a named export bundle. e.g. for 'foo::bar::baz', it could be
 *    . package foo, export '.' bundle, module bar
 *    . package foo, export './bar' bundle, element baz
 *    . package foo, export './bar/baz' bundle, module lib.wesl, element baz
 * To distinguish these, we look at the export entries in package foo's package.json
 *
 */
