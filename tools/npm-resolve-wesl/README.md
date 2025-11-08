# npm-resolve-wesl

[![Crates.io](https://img.shields.io/crates/v/npm-resolve-wesl.svg)](https://crates.io/crates/npm-resolve-wesl)
[![Documentation](https://docs.rs/npm-resolve-wesl/badge.svg)](https://docs.rs/npm-resolve-wesl)
[![License](https://img.shields.io/crates/l/npm-resolve-wesl.svg)](https://github.com/wgsl-tooling-wg/wesl-js#license)

A Rust implementation of npm package resolution for WESL (WebGPU Shading Language) modules.

This package provides functionality to resolve WESL module paths (e.g., `foo::bar::baz`) to npm packages and parse `weslBundle.js` files to extract shader code and dependencies.

## Features

- **CLI Tool**: Resolve WESL module paths from the command line
- **Module Path Resolution**: Resolves WESL module paths to npm packages using Node.js ESM resolution algorithm
- **Bundle Parsing**: Parses `weslBundle.js` files to extract shader modules and metadata
- **OXC-based**: Uses the fast OXC parser and resolver for maximum performance
- **Compatible with TypeScript implementation**: Mirrors the behavior of the TypeScript `parseDependencies` and `dependencyBundles` functions

## CLI Usage

```bash
# Resolve a single module path
npm-resolve-wesl random_wgsl::pcg

# Resolve from a specific project directory
npm-resolve-wesl foo::bar::baz -d /path/to/project

# Resolve multiple modules
npm-resolve-wesl pkg1::fn pkg2::util

# Output as JSON
npm-resolve-wesl random_wgsl::pcg --json

# Verbose mode
npm-resolve-wesl random_wgsl::pcg --verbose
```

### Development Example

```bash
# From npm-resolve-wesl directory, resolve lygia modules
cargo run -- lygia::sdf::rectSDF -d ../examples/lygia-example
```

### Installation

```bash
cargo install --path .
# Or for development:
cargo build --release
./target/release/npm-resolve-wesl --help
```

## Library Usage

### Resolving Dependencies

```rust
use npm_resolve_wesl::parse_dependencies;

let module_paths = vec!["random_wgsl::pcg".to_string()];
let project_dir = std::path::Path::new("/path/to/project");

let resolved_packages = parse_dependencies(&module_paths, project_dir);
// Returns: ["random_wgsl"]
```

### Parsing Bundle Files

```rust
use npm_resolve_wesl::parse::parse_wesl_bundle;
use std::path::Path;

let bundle_path = Path::new("node_modules/random_wgsl/dist/weslBundle.js");
let bundle = parse_wesl_bundle(bundle_path).unwrap();

println!("Package: {}", bundle.name);
println!("Edition: {}", bundle.edition);
println!("Modules: {} shader files", bundle.modules.len());
```

### Complete Workflow

```rust
use npm_resolve_wesl::dependency_bundles;

let module_paths = vec!["random_wgsl::pcg".to_string()];
let project_dir = std::path::Path::new("/path/to/project");

let bundles = dependency_bundles(&module_paths, project_dir).unwrap();
for bundle in bundles {
    println!("Loaded bundle: {}", bundle.name);
    for (path, code) in bundle.modules {
        println!("  Module: {} ({} bytes)", path, code.len());
    }
}
```

## Implementation Details

### Resolution Algorithm

The resolution process follows these steps:

1. **Split module paths**: `foo::bar::baz` → `["foo", "bar", "baz"]`
2. **Try longest subpath first**: Tests `foo/bar/baz`, then `foo/bar`, then `foo`
3. **Use Node.js resolution**: Leverages `oxc_resolver` with ESM conditions (`["node", "import"]`)
4. **Return first match**: Returns the longest resolvable package path

This mirrors the TypeScript implementation in `ParseDependencies.ts`.

### Bundle Structure

A `WeslBundle` contains:

```rust
pub struct WeslBundle {
    pub name: String,              // Package name
    pub edition: String,           // WESL edition (e.g., "unstable_2025_1")
    pub modules: Vec<(String, String)>,  // (path, source code) pairs
    pub dependencies: Vec<WeslBundle>,   // Transitive dependencies
}
```

### Parser Implementation

The parser uses OXC to:

1. Parse JavaScript/TypeScript code with `oxc_parser`
2. Walk the AST using the visitor pattern
3. Extract the `weslBundle` object literal
4. Build the `WeslBundle` structure

## Testing

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_parse_simple_bundle
```

### Test Structure

- **Unit tests**: Basic parsing and resolution logic in `src/`
- **Integration tests**: Tests against real packages in `tests/integration_test.rs`
- **Lygia tests**: Tests against the published lygia package in `tests/lygia_test.rs`

### Test Requirements

Some integration tests require proper node_modules setup:

```bash
# From tools directory
pnpm install

# Tests will gracefully skip if packages aren't available
```

## See Also

- TypeScript implementation: `tools/packages/wesl-tooling/src/ParseDependencies.ts`
