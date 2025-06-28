# Bench Test Runner

## Benchmark

```sh
pnpm bench
```

### Variations
- See options:
  ```sh
  pnpm bench --help
  ```

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
  # mostly works, uses webkit engine from safari/ios. (no gc time collection)
  pnpm bench:bun
  ```

### other operating systems
Note that cpu counters (via @mitata/counters) only work on macos and linux

## Profiling advice

Start by benchmarking against the current version to verify accuracy.

  ```sh
  pnpm bench:baseline HEAD      # copy HEAD verison of wesl-js/tools to _baseline
  sudo pnpm bench:details       # run a detailed benchmark
  ```

Aim for results accurate to <1% on the p50 lines/second metric. 

* Reduce benchmark distractions by turning off extra programs on your machine.
* Increase the benchmark time to 30 seconds or more
 (and filter to just one benchmark of interest.)
* Re-run benchmarks multiple times to confirm results.
* Use baseline mode, comparing against a run from a while ago is less accurate.

## Future Work
* investigate ways to get better accuracy. 1% accuracy makes it hard to see fine grained improvements
* run benchmarks in a node isolate / webcontainer 
* report on jit optimizing/deoptimizing 
