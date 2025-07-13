# Developing wesl-js

## Git Submodules

This is a meta repository with several related projects
included as git submodules.

We recommend setting `git config submodule.recurse true` for this project,
to make working with Git submodules easier.

## 

The main wesl tools are in the /tools directory.

### Install packages:

```sh
cd wesl-js
pnpm install
```

### Scripts

See `wesl-js/tools/package.json` for scripts you can run. 

This is the most common one:

```sh
pnpm test
```

If it fails with a `Error [ERR_MODULE_NOT_FOUND]:`, try doing `pnpm run build:all` first.

Wallaby is also available for most tests, use the configuration in `wesl-js/wallaby.js`

### wesl tool packages

- *wesl* The main library in the suite,
- *wesl-plugin* wesl build plugins for vite, webpack, etc.
parses WESL sources and links to WGSL.
- *wesl-link* a command line tool to link multiple WESL files into one WGSL file.
- *wesl-packager* a command line tool to contruct
WESL npm packages.

- *bench* benchmark tests of linker performance.
- *mini-parse* a PEG parser combinator library used by the linker.
- *random_wgsl* a sample WESL npm package

## Test Packages
Supporting sources for tests are available as subprojects in the
`/wesl-testsuite` directory.