# Publishing Checklist

## Before First Release

### 1. Update Cargo.toml metadata
- [ ] Update `authors` field with your name and email
- [ ] Verify `description` is accurate (max 200 chars for crates.io)
- [ ] Confirm `repository` URL is correct
- [ ] Set appropriate `rust-version` (currently 1.70, check if this is accurate)

### 2. Verify documentation
- [ ] Ensure all public APIs have doc comments
- [ ] Test docs locally: `cargo doc --open --no-deps`
- [ ] Check that examples run: `cargo run --example basic_usage`

### 3. Run quality checks
```bash
# Format code
cargo fmt --check

# Run clippy with strict settings
cargo clippy --all-targets --all-features -- -D warnings

# Run all tests
cargo test --all-targets

# Check for outdated dependencies
cargo outdated

# Verify package contents
cargo package --list
```

### 4. Update version and changelog
- [ ] Update version in `Cargo.toml` (use semantic versioning)
- [ ] Update `CHANGELOG.md` with release date and changes
- [ ] Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`

### 5. Dry run
```bash
# Build the package
cargo package --allow-dirty

# Test the package
cargo publish --dry-run
```

### 6. Publish
```bash
# Login to crates.io (one-time)
cargo login

# Publish!
cargo publish
```

## After Publishing

- [ ] Verify package appears on crates.io
- [ ] Test installation: `cargo install npm-resolve-wesl`
- [ ] Check docs.rs rendered correctly
- [ ] Update README if needed
- [ ] Announce release (if applicable)

## For Subsequent Releases

1. Update version in `Cargo.toml`
2. Update `CHANGELOG.md`
3. Commit changes
4. Create git tag
5. Run tests and quality checks
6. `cargo publish`
7. Push commits and tags: `git push && git push --tags`

## Common Issues

### Dependency versions
- Use `^` for compatible updates: `serde = "^1.0"`
- Lock major versions that might break: `oxc_parser = "0.40"`

### Documentation
- Mark experimental APIs with `#[doc = "⚠️ Experimental"]`
- Use `#![deny(missing_docs)]` to enforce documentation

### Testing
- Integration tests go in `tests/`
- Use `#[ignore]` for tests that require network/setup
- Document test requirements in README

## Resources

- [Cargo book on publishing](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Semantic Versioning](https://semver.org/)
