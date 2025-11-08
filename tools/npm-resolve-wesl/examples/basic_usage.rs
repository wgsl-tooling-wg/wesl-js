use npm_resolve_wesl::{dependency_bundles, parse_dependencies};

fn main() {
    // Example module paths
    let module_paths = vec![
        "random_wgsl::pcg".to_string(),
        "lygia::space::scale".to_string(),
    ];

    // Directory containing node_modules (current directory for this example)
    let project_dir = std::env::current_dir().expect("Failed to get current directory");

    println!("Resolving WESL module paths...\n");

    // Step 1: Resolve module paths to package paths
    let resolved = parse_dependencies(&module_paths, &project_dir);
    println!("Resolved {} packages:", resolved.len());
    for pkg in &resolved {
        println!("  - {}", pkg);
    }
    println!();

    // Step 2: Load bundles from resolved packages
    match dependency_bundles(&module_paths, &project_dir) {
        Ok(bundles) => {
            println!("Loaded {} bundles:\n", bundles.len());
            for bundle in bundles {
                println!("Bundle: {} (edition: {})", bundle.name, bundle.edition);
                println!("  Modules: {}", bundle.modules.len());
                for (name, _code) in bundle.modules {
                    println!("    - {}", name);
                }
                println!();
            }
        }
        Err(e) => {
            eprintln!("Error loading bundles: {}", e);
            eprintln!("\nNote: Make sure you have the required packages installed via npm/pnpm");
        }
    }
}
