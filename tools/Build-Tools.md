### commits
- all pushes to the main branch shared repository should pass all tests, lint/formatting rules, commenting standards
- interim commits needn't pass all the quality rules and encouraged to increase clarity for future readers. Best to put interim fixes on a branch or prefix with `interim:`.

### prepush script
- the `pnpm prepush` script verifies tests, linting, formatting before pushing to the main branch of the shared repository

### linting
- biomejs is the current primary linter/formatter.
- oxlint is run on the prepush script, and is expected to pass for every main branch push.
- eslint is available to run manually, but is not required to pass for every main branch push.
- rationale: biome has currently the best combination features and stability. oxlint is up and coming. eslint is obsolescent but still catches some things that other linters miss.

### typecheck:watch
- run typescript typechecking continuously in the terminal.

### prep:examples
- user example wesl-js projects are in the main wesl-js repo
so that typechecking (and eventually testing) can help keep the examples up to date. 
- the prep:examples script exports the examples 
to a separate git repo
and rewrites their package.json files to depend on 
the current published wesl packages.
- The sepearate repo without workspace:* dependencies in package.json
is useful so that visitors can have a clean version to copy from,
and so that stackblitz examples will work.
- prep:examples should be run after each new release, 
so that the examples use the latest version of wesl-js.