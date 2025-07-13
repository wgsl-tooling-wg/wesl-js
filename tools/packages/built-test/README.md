# built-test 
The built-test package tests packaged versions of the wesl-js npm libraries
like wesl and wesl-plugin.

Internal development runs against the source code for each package,
but built-test tests the version that will be published to npm.
- each wesl-js package is built and 'pnpm pack' creates the publishable npm bundles
- **this entire directory is copied to temp-built-test**
- the temp-built-test package dependencies are modified to use the 
  newly packed bundles. 
- the tests/ are run with vitest in temp-built-test.
- we also typecheck in temp-built-test to verify the d.ts file references are correct


The test also runs in normal monorepo local mode using source files rather than bundles.

### Notes
- We explcitly depend on vite to fulfill the vitest's peer dependency
  (otherwise we get an old version of vite/esbuilt which warns about es2024)

