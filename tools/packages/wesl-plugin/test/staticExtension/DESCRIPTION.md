# test/staticExtension

test `?static` with a sources and shaders in nested directories and a `wesl.toml` file.

```ts
import wgsl from "../shaders/foo/app.wesl?static";
```

uses a normal unit test
