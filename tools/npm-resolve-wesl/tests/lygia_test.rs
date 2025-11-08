use npm_resolve_wesl::parse::parse_wesl_bundle;
use std::path::PathBuf;

#[test]
fn test_parse_lygia() {
    let node_modules = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("node_modules");

    // Find lygia in pnpm's .pnpm directory structure
    let lygia_path = walkdir::WalkDir::new(node_modules.join(".pnpm"))
        .max_depth(4)
        .into_iter()
        .filter_map(|e| e.ok())
        .find(|e| e.file_name() == "lygia" && e.path().join("dist").exists())
        .map(|e| e.path().join("dist"));

    let Some(lygia_path) = lygia_path else {
        eprintln!("lygia not found in node_modules, skipping test");
        return;
    };
    eprintln!("Found lygia at {:?}", lygia_path);

    let bundles: Vec<_> = walkdir::WalkDir::new(&lygia_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() == "weslBundle.js")
        .take(5)
        .collect();

    if bundles.is_empty() {
        return;
    }

    for entry in bundles {
        eprintln!("Testing lygia bundle: {:?}", entry.path());
        let result = parse_wesl_bundle(entry.path()).unwrap();
        eprintln!("  name: {}, modules: {:?}", result.name, result.modules.iter().map(|(k, _)| k).collect::<Vec<_>>());
        assert_eq!(result.name, "lygia");
        assert_eq!(result.edition, "unstable_2025_1");
        assert!(!result.modules.is_empty());
    }
}
