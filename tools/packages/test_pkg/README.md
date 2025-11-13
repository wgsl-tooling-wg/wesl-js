# Test Package Artifacts

This directory contains test packages used for testing WESL package functionality.

## Directory Structure

- `dependent_package/` - Single-bundle WESL package
- `multi_pkg/` - Multi-bundle WESL package with dependencies
- `*.tgz` - Packed tarballs for testing bundle loaders

## Regenerating Tarballs

After modifying the test packages, regenerate the tarballs:

```bash
# From this directory (tools/packages/test_pkg)
cd dependent_package && pnpm pack --pack-destination .. && cd ..
cd multi_pkg && pnpm pack --pack-destination .. && cd ..
```

Or from repository root:

```bash
cd tools/packages/test_pkg
./pack-test-packages.sh
```

## Test Packages

### dependent_package

A simple single-bundle package with one shader module.

- **Bundle**: `dist/weslBundle.js`
- **Source**: `shaders/lib.wesl`
- **Dependencies**: None

### multi_pkg

A multi-bundle package demonstrating:
- Multiple WESL bundles in subdirectories
- Cross-package dependencies (imports `dependent_package`)

- **Bundles**:
  - `dist/dir/nested/weslBundle.js`
  - `dist/second/weslBundle.js`
  - `dist/transitive/weslBundle.js` (depends on `dependent_package`)
- **Sources**: `shaders/dir/nested.wesl`, `shaders/second.wesl`, `shaders/transitive.wesl`
- **Dependencies**: `dependent_package`

## Notes

- Both packages have `"private": true` to prevent accidental publication
- Version numbers are required for `pnpm pack` but don't affect publishing (private packages can't be published)