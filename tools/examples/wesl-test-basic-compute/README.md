# wesl-test Basic Compute Example

This example shows how to test a WGSL compute shader using wesl-test.

## Structure

- `shaders/hash.wgsl` - Hash function for procedural generation
- `test/hash.test.ts` - Unit test using wesl-test
- `wesl.toml` - WESL configuration pointing to shader directory

## Running

```bash
pnpm install
pnpm test
```

## What's Happening

1. The test imports the hash function via WESL: `import package::hash::lowbias32`
2. A compute shader invokes the function 256 times using `@workgroup_size(256)`
3. `testCompute()` automatically provides a `test::results` buffer for output
4. A helper function `validateRandom()` checks statistical properties:
   - Mean within 7.5% of expected value (2^31)
   - No duplicate values in 256 samples

This demonstrates a realistic testing workflow for shader utilities!

## Key Points

- **WESL imports** - Import shader functions from files instead of copy-pasting
- **Multiple invocations** - Test with many values using `@workgroup_size`
- **Statistical validation** - Check hash quality properties like distribution and uniqueness
- **Helper functions** - Extract validation logic for cleaner, reusable tests
- **No build step** - WESL resolves imports automatically during testing

## Learn More

- [wesl-test README](../../packages/wesl-test/README.md) - Quick start guide
- [wesl-test API](../../packages/wesl-test/API.md) - Complete API reference
