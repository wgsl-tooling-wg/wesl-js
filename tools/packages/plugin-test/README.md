# Dev Tips

Get live updating on most development changes by doing the following in separate shells:

Run vite via nodemon, watching for local changes and also for
changes to the `linker/dist` and `plugin/dist` directories:

```sh
pnpm dev
```

Build `linker/dist` on watch mode:

```sh
cd ../linker
pnpm vite build --watch
```

Build `plugin/dist/` on watch mode.

```sh
cd ../plugin
pnpm dev
```
