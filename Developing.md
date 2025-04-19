# Developing wesl-js

## Git Submodules

This is a meta repository with several related projects
included as git submodules.

We recommend setting `git config submodule.recurse true` for this project,
to make working with Git submodules easier.

## Install Deno AND Node.js

Make sure that you have a recent version of 
- [Deno](https://deno.com/)
- [Node.js](https://nodejs.org/) with npm

## Install deps

```
deno install
```

This generates a `node_modules` folder.

## Run tests

```
deno run dev
```

### Update Snapshots

```
deno test --allow-all -- --update
```

For snapshot testing, we are using https://jsr.io/@std/testing/doc/snapshot

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
`/wesl-testsuite` directory
and in the `/community-wgsl` directory.