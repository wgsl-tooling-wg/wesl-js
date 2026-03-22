# test/LinkExtensionNoToml

test `?link` with a no wesl.toml specified in the vite config and packaged libraries automatically detected.

test launches `vite build` externally so that the test can chdir to the local directory
A test driver logs the impor of `?link` to the console and the unit test verifies
the results.
