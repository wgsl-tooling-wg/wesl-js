mod npm_resolver;
mod package_name_utils;
mod resolve;

pub mod parse;

// Re-export main types for convenience
pub use parse::parse_wesl_bundle;

use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WeslResolveError {
    #[error("Failed to resolve package: {0}")]
    ResolveError(String),

    #[error("Failed to parse bundle: {0}")]
    ParseError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Represents a parsed WESL bundle
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct WeslBundle {
    pub name: String,
    pub edition: String,
    pub modules: Vec<(String, String)>,
    pub dependencies: Vec<WeslBundle>,
}

/// Parse WESL module paths (e.g., "foo::bar::baz") and find the npm packages they resolve to.
///
/// This function mimics the TypeScript `parseDependencies` function. It takes module paths
/// with `::` separators and tries to resolve them as npm packages using Node.js resolution.
///
/// # Arguments
/// * `module_paths` - List of WESL module paths like "random_wgsl::pcg" or "foo::bar::baz"
/// * `project_dir` - Directory to resolve from (typically the directory containing package.json)
///
/// # Returns
/// A vector of resolved npm package names (e.g., ["random_wgsl", "foo/bar"])
pub fn parse_dependencies<P: AsRef<Path>>(module_paths: &[String], project_dir: P) -> Vec<String> {
    resolve::resolve_dependencies(module_paths, project_dir.as_ref())
}

/// Load WESL bundles from resolved package paths.
///
/// This function takes resolved package paths and parses the weslBundle.js files to extract
/// the bundle data including name, edition, modules, and transitive dependencies.
///
/// # Arguments
/// * `package_paths` - List of resolved package file paths
///
/// # Returns
/// A vector of parsed WeslBundle structs
pub fn load_bundles<P: AsRef<Path>>(
    package_paths: &[P],
) -> Result<Vec<WeslBundle>, WeslResolveError> {
    package_paths
        .iter()
        .map(|path| parse::parse_wesl_bundle(path.as_ref()))
        .collect()
}

/// Complete workflow: resolve module paths to npm packages and load their bundles.
///
/// This is equivalent to the TypeScript `dependencyBundles` function.
///
/// # Arguments
/// * `module_paths` - List of WESL module paths like "random_wgsl::pcg"
/// * `project_dir` - Directory to resolve from
///
/// # Returns
/// A vector of loaded WeslBundle structs
pub fn dependency_bundles<P: AsRef<Path>>(
    module_paths: &[String],
    project_dir: P,
) -> Result<Vec<WeslBundle>, WeslResolveError> {
    let resolved = parse_dependencies(module_paths, project_dir);
    let paths: Vec<PathBuf> = resolved.iter().map(PathBuf::from).collect();
    load_bundles(&paths)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_dependencies_no_panic() {
        // Smoke test - should not panic even with invalid input
        let module_paths = vec!["test::module".to_string()];
        let deps = parse_dependencies(&module_paths, ".");
        // Will be empty without packages installed
        assert!(deps.is_empty());
    }

    #[test]
    fn test_dependency_bundles_error_handling() {
        // Should handle missing packages gracefully
        let module_paths = vec!["nonexistent::package".to_string()];
        let result = dependency_bundles(&module_paths, ".");
        // Should either be empty or error (expected for missing packages)
        if let Ok(bundles) = result {
            assert!(bundles.is_empty());
        }
    }
}
