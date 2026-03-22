# test/LinkExtension

test `?link` with a wesl.toml dependency containing a subpath.

uses a normal unit test, and import.meta.url to set the path to the wesl.toml file
(which varies if the test is run from the tools directory)
