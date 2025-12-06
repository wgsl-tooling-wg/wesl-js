# wgsl-test Fragment Gradient Example

This example shows how to test a WGSL fragment shader using visual regression testing with wgsl-test.

## Structure

- `shaders/gradient.wgsl` - Simple gradient fragment shader
- `test/gradient.test.ts` - Visual regression test using `expectFragmentImage()`
- `wesl.toml` - WESL configuration pointing to shader directory

## Running

```bash
pnpm install
pnpm test
```

## What's Happening

1. The shader renders a horizontal gradient from red to blue
2. It uses `@builtin(position)` to get pixel coordinates
3. The `test::Uniforms` provides resolution for normalized coordinates
4. `expectFragmentImage()` automatically compares the rendered output against a snapshot
5. The snapshot is stored in `test/__image_snapshots__/gradient.png`

This demonstrates visual regression testing for fragment shaders!

## Key Points

- **Visual regression testing** - Automatically catch rendering changes
- **Snapshot workflow** - Initial run creates baseline, subsequent runs compare
- **Update snapshots** - Use `vitest -u` when visual changes are intentional
- **File-based testing** - `expectFragmentImage()` loads shaders from files
- **Automatic naming** - Snapshot name derived from shader path

## Updating Snapshots

When you intentionally change the shader's visual output:

```bash
pnpm test -- -u
```

This updates the snapshot to the new expected output.

## Learn More

- [wgsl-test README](../../packages/wgsl-test/README.md) - Quick start guide
- [wgsl-test IMAGE_TESTING](../../packages/wgsl-test/IMAGE_TESTING.md) - Visual regression guide
