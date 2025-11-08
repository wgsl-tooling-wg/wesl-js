use crate::npm_resolver::npm_resolve_wesl;
use std::collections::HashSet;
use std::path::Path;

/// Resolve WESL module paths to npm package names.
///
/// This mimics the TypeScript implementation in ParseDependencies.ts.
/// Given module paths like "foo::bar::baz", tries to resolve them as npm packages
/// by testing subpaths from longest to shortest with name variations.
///
/// # Arguments
/// * `module_paths` - WESL module paths with :: separators
/// * `project_dir` - Directory to resolve from (should contain node_modules)
///
/// # Returns
/// Unique list of resolved npm package names/paths
pub fn resolve_dependencies(module_paths: &[String], project_dir: &Path) -> Vec<String> {
    let mut deps = HashSet::new();

    for module_path in module_paths {
        let segments: Vec<&str> = module_path.split("::").collect();

        // Filter out single segments (likely builtins) and 'constants' (linker virtual)
        if segments.len() < 2 || segments[0] == "constants" {
            continue;
        }

        if let Some(resolved) = npm_resolve_wesl(&segments, project_dir) {
            deps.insert(resolved);
        }
    }

    deps.into_iter().collect()
}
