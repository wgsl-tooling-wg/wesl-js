# test/staticExtension

test `?static` with sources and shaders in nested directories and a `wesl.toml` file.
Conditions are passed as query parameters.

```ts
import wgsl from "../shaders/foo/app.wesl?MOBILE=true&FUN&SAFE=false&static";
```

uses a normal unit test.
