# WESL linking from the command line

This example shows how you can link with Lygia from the command line.

The command line [wesl-link] tool knits together local wgsl/wesl shader code and writes
linked wgsl to stdout.

```sh
npx wesl-link
```

or:

```sh
pnpm install
pnpm dev
```

It's simple, no bundlers or runtime libraries are required.
Just fetch the [wesl-link] command from npm and run it.

The command line approach is designed for users who want to integrate shader linking into a custom build pipeline.

See [JavasScript Builds](https://wesl-lang.dev/docs/JavaScript-Builds)
for additional documentation on [wesl-link] and for other linking options.

[wesl-link]: https://www.npmjs.com/package/wesl-link
