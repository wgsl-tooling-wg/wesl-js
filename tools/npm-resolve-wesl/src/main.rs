use clap::Parser;
use npm_resolve_wesl::{dependency_bundles, parse_dependencies};
use std::path::PathBuf;

/// Resolve WESL module paths to npm packages
///
/// Examples:
///   npm-resolve-wesl random_wgsl::pcg
///   npm-resolve-wesl foo::bar::baz -d /path/to/project
///   npm-resolve-wesl pkg1::fn pkg2::util --json
#[derive(Parser)]
#[command(name = "npm-resolve-wesl")]
#[command(
    about = "Resolve WESL module paths to npm package names",
    verbatim_doc_comment
)]
struct Cli {
    /// WESL module paths to resolve (e.g., random_wgsl::pcg, foo::bar::baz)
    #[arg(required = true)]
    modules: Vec<String>,

    /// Project directory containing node_modules
    #[arg(short = 'd', long = "dir", default_value = ".")]
    project_dir: PathBuf,

    /// Output as JSON array
    #[arg(short = 'j', long = "json")]
    json: bool,

    /// Verbose output
    #[arg(short = 'v', long = "verbose")]
    verbose: bool,
}

fn main() {
    let cli = Cli::parse();

    let project_dir = cli.project_dir.canonicalize().unwrap_or_else(|e| {
        eprintln!("Error: cannot resolve directory {:?}: {}", cli.project_dir, e);
        std::process::exit(1);
    });

    if cli.verbose {
        eprintln!(
            "Resolving {} module(s) from {:?}",
            cli.modules.len(),
            project_dir
        );
        for m in &cli.modules {
            eprintln!("  - {}", m);
        }
    }

    let resolved = parse_dependencies(&cli.modules, &project_dir);

    if cli.verbose {
        eprintln!("Resolved packages: {:?}", resolved);
    }

    match dependency_bundles(&cli.modules, &project_dir) {
        Ok(bundles) => {
            if cli.json {
                println!("{}", serde_json::to_string_pretty(&bundles).unwrap());
            } else {
                if bundles.is_empty() {
                    if !cli.verbose {
                        eprintln!("No bundles resolved. Try --verbose for more info.");
                    }
                    std::process::exit(1);
                }

                for bundle in bundles {
                    println!("Bundle: {} (edition: {})", bundle.name, bundle.edition);
                    println!("Modules:");
                    for (name, code) in bundle.modules {
                        println!("  {}:", name);
                        for line in code.lines() {
                            println!("    {}", line);
                        }
                    }
                    println!();
                }
            }
        }
        Err(e) => {
            eprintln!("Error loading bundles: {}", e);
            std::process::exit(1);
        }
    }
}
