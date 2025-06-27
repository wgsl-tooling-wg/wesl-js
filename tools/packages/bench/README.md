# Bench Test Runner

## Profiling

Launch with:

```sh
pnpm tsx --inspect-brk bin/bench.ts  --profile
```

And then launch the chrome debugger and press the green node button, and press play
to continue execution of the script.
See instructions [here](https://developer.chrome.com/docs/devtools/performance/nodejs).

## Benchmark

```sh
pnpm tsx bin/bench.ts  --bench
```


## other js engines
```sh
# works?
bun --expose-gc bin/bench.ts

# doesn't find baseline, or collect gc perf data
deno --allow-all --v8-flags="--expose-gc" bin/bench.ts
```
