# test/LinkExtension

test `?link` with a sources and shaders in nested directories and a `wesl.toml` file.

```ts
import linkParams from "../shaders/foo/app.wesl?link";
```

uses a normal unit test, and import.meta.url to set the path to the wesl.toml file
(which varies if the test is run from the tools directory)
