# Developing wesl-js

## Git Submodules

This is a meta repository with several related projects
included as git submodules. 

We recommend seting `git config --global submodule.recurse true` for this project,
to make working with Git submodules easier.

## 

The main wesl tools are in the /linker directory.

### Install packages:

```sh
cd wesl-js/linker
pnpm install
```

### Scripts

See `wesl-js/linker/package.json` for scripts you can run. 

This is the most common one:

```sh
pnpm test
```

If it fails with a `Error [ERR_MODULE_NOT_FOUND]:`, try doing `pnpm run build:all` first.

Wallaby is also available for most tests, use the configuration in `wesl-js/linker/wallaby.js`

### wesl tool packages

- *linker* The main library in the suite,
parses WESL sources and links to WGSL.
- *cli* a command line tool to link statically at build time.
- *packager* a command line tool to contruct
WESL npm packages.
- *plugin* wesl build plugins for vite, webpack, etc.

- *bench* benchmark tests of linker performance.
- *mini-parse* a PEG parser combinator library used by the linker.
- *random_wgsl* a sample WESL npm package

## Test Packages
Supporting sources for tests are available as subprojects in the
`/wesl-testsuite` directory
and in the `/community-wgsl` directory.