# Dev Tips

Get live updating on most development changes by doing the following in separate shells:

Run vite via nodemon, watching for local changes and also for
changes to the `wesl/dist` and `wesl-plugin/dist` directories:

```sh
pnpm dev
```

Build `wesl/dist` on watch mode:

```sh
cd ../wesl
pnpm vite build --watch
```

Build `wesl-plugin/dist/` on watch mode.

```sh
cd ../wesl-plugin
pnpm dev
```
