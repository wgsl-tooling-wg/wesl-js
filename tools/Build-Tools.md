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
