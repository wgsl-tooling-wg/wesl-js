# WESL

[![NPM Version](https://img.shields.io/npm/v/wesl)](https://www.npmjs.com/package/wesl)
[![Static Badge](https://img.shields.io/badge/Read%20the%20-Docs-blue)](https://wesl-lang.dev/)


> **[WESL]** enriches the WGSL shader language with extensions like `import`, `@if`.

**wesl-js** has tools and libraries for JavaScript / TypeScript projects to use [WESL].


## With a Bundler

Using WESL with a bundler is the recommended experience. 
[Get started with wesl-plugin](/tools/packages/wesl-plugin#wesl-plugin).

```
npm install wesl
npm install -D wesl-plugin
```

## Vanilla

If you are using vite, esbuild, rollup, webpack, or any other bundler, then we recommend [wesl-plugin](/tools/packages/wesl-plugin#wesl-plugin) instead.

[Get started with vanilla WESL](/tools/packages/wesl#wesl).

## Examples

- [Using WESL with a bundler](https://github.com/wgsl-tooling-wg/examples/tree/main/wesl-sample-vite)
- [Vanilla WESL](https://github.com/wgsl-tooling-wg/examples/tree/main/wesl-sample-vanilla)
- [More examples](https://github.com/wgsl-tooling-wg/examples)

<!-- TODO: Finish up the rest of the readme -->

### Linking Features

Linking `.wesl` and `.wgsl` files.
analogous to esbuild for `.js` and `.ts`.

As with other programming languages,
module linking becomes useful when your WGSL code grows
large enough to be split into separate reusable files.
Linking integrates the code modules together while solving for:

* renaming - Two functions with the same name?
The linker will rename one of them, and rewrite all the calls to the renamed function.
* deduplication - Two modules import the same function? You get only one copy.
* recursion - Importing a function that references another import? You get all references, recursively.
* dead code - Importing a function from a big module?
You get only that function and its references, not the whole file.

## Packaging your own

## Other ways to dynamically link WESL

### other bundler plugins

esbuild, rollup, etc.

### no bundler required

provide your own list of shader strings.

## static linking WESL

### linking from the command line

[cli]

## wesl-rs

See also [wesl-rs] for using WESL in Rust/C++ projects.
[wesl-rs] and [wesl-js] are interoperable implementations of
the same WESL specification.

## Developing

See [Developing](/Developing.md) for working on wesl-js itself

[wesl-rs]: https://github.com/wgsl-tooling-wg/wesl-rs
[wesl-js]: https://github.com/wgsl-tooling-wg/wesl-js
[WESL]: https://wesl-lang.dev/
[cli]: /tools/packages/cli/README.md

## License

Except where noted (below and/or in individual files), all code in this repository is dual-licensed under either:

* MIT License ([LICENSE-MIT](LICENSE-MIT) or [http://opensource.org/licenses/MIT](http://opensource.org/licenses/MIT))
* Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0))

at your option.

### Your contributions

Unless you explicitly state otherwise,
any contribution intentionally submitted for inclusion in the work by you,
as defined in the Apache-2.0 license,
shall be dual licensed as above,
without any additional terms or conditions.
