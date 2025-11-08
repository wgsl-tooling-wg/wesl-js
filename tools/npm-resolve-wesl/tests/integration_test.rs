use npm_resolve_wesl::{parse::parse_wesl_bundle, parse_dependencies};
use std::path::PathBuf;

fn test_pkg_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("packages/test_pkg")
}

#[test]
fn test_resolve_deps() {
    let dir = test_pkg_dir();
    if !dir.exists() {
        return;
    }

    let paths = vec!["dependent_package::dep".to_string()];
    let deps = parse_dependencies(&paths, &dir);

    if !deps.is_empty() {
        assert!(deps.contains(&"dependent_package".to_string()));
    }
}

#[test]
fn test_parse_bundles() {
    let packages_dir = test_pkg_dir().parent().unwrap().to_path_buf();
    let bundles = [
        (
            "test_pkg/dependent_package/dist/weslBundle.js",
            "dependent_package",
            "lib.wesl",
        ),
        (
            "test_pkg/multi_pkg/dist/dir/nested/weslBundle.js",
            "multi_pkg",
            "dir/nested",
        ),
        ("random_wgsl/dist/weslBundle.js", "random_wgsl", "lib.wgsl"),
    ];

    for (path, name, expected_module) in bundles {
        let bundle_path = packages_dir.join(path);
        eprintln!("Testing bundle at {:?}", bundle_path);
        if !bundle_path.exists() {
            eprintln!(
                "Skipping test_parse_bundles for missing bundle: {:?}",
                bundle_path
            );
            continue;
        }

        let result = parse_wesl_bundle(&bundle_path).unwrap();
        eprintln!("  name: {}, edition: {}", result.name, result.edition);
        eprintln!("  modules: {:?}", result.modules.iter().map(|(k, _)| k).collect::<Vec<_>>());
        assert_eq!(result.name, name);
        assert_eq!(result.edition, "unstable_2025_1");
        assert!(
            result
                .modules
                .iter()
                .any(|(p, _)| p.contains(expected_module))
        );
    }
}
