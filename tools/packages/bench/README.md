# Bench Test Runner

## Benchmark

```sh
pnpm bench
```

### Variations
- Include metrics from the internal cpu counter (requires root):
  ```sh
  pnpm bench:details
  ```

- Run only some tests (substring or regexp match)
  ```sh
  bench:details --filter import
  ```

- Adjust the minimum time per benchmark 
  ```sh
  pnpm bench:details --time 5
  ```

- Disable comparison with baseline
  ```sh
  pnpm bench:details --no-baseline
  ```

### Setup baseline version
Copies an earlier version of the tools tree to `wesl-js/_baseline`.
  ```sh
  pnpm bench:baseline v0.6.6
  ```

### Debug / Profiling
- Run one iteration, stopping to attach chrome debugger for profiling.
  ```sh
  pnpm bench:profile
  ```
  - And then launch the chrome debugger and press the green node button, and press play
  to continue execution of the script.
  See instructions [here](https://developer.chrome.com/docs/devtools/performance/nodejs).


### other js engines
```sh
# works?
bun --expose-gc bin/bench.ts

# doesn't find baseline, or collect gc perf data
deno --allow-all --v8-flags="--expose-gc" bin/bench.ts
```
