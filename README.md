# **WESL**

[![NPM Version](https://img.shields.io/npm/v/wesl)](https://www.npmjs.com/package/wesl)
[![Static Badge](https://img.shields.io/badge/Read%20the%20-Docs-blue)](https://wesl-lang.dev/)


> **[WESL]** enriches the WGSL shader language with extensions like `import`, `@if`.

**wesl-js** has tools and libraries for JavaScript / TypeScript projects to use [WESL].


## With a Bundler

Using WESL with a bundler plugin is **the recommended experience**. 

[Get started with wesl-plugin](/tools/packages/wesl-plugin#wesl-plugin).

```sh
npm install wesl
npm install -D wesl-plugin
```

## Vanilla

To use WESL as a library, use the `link` API.

[Get started with vanilla WESL](/tools/packages/wesl#wesl).

```sh
npm install wesl
```

## Examples

- [Using WESL with a bundler](https://github.com/wgsl-tooling-wg/examples/tree/main/wesl-sample-vite)
- [Vanilla WESL](https://github.com/wgsl-tooling-wg/examples/tree/main/wesl-sample-vanilla)
- [More examples](https://github.com/wgsl-tooling-wg/examples)


## Linking from the command line

Do you only want to link a few .wgsl files together, and do not need libraries?

[Check out the CLI](/tools/packages/wesl-link/)


## Packaging your own

Want to publish your WESL library?

[Use our packaging tool](/tools/packages/wesl-packager/)

## wesl-rs

See also [wesl-rs] for using WESL in Rust/C++ projects.
[wesl-rs] and [wesl-js] are interoperable implementations of
the WESL specification.

## Developing

See [Developing](/Developing.md) for working on wesl-js itself

[wesl-rs]: https://github.com/wgsl-tooling-wg/wesl-rs
[wesl-js]: https://github.com/wgsl-tooling-wg/wesl-js
[WESL]: https://wesl-lang.dev/

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
