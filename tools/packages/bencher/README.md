# Bencher

A TypeScript benchmarking library with CLI support for running performance tests.

## Installation

```bash
npm install bencher
# or
pnpm add bencher
```

## Quick Start

```typescript
import { parseBenchArgs, runBenchmarks, reportResults, timeSection, runsSection, type BenchSuite } from 'bencher';

const suite: BenchSuite = {
  name: "String Operations",
  groups: [
    {
      name: "Concatenation",
      benchmarks: [
        { name: "plus", fn: () => "a" + "b" },
        { name: "template", fn: () => `a${"b"}` },
      ],
    },
  ],
};

const args = parseBenchArgs();
const results = await runBenchmarks(suite, args);
const table = reportResults(results, [timeSection, runsSection]);
console.log(table);
```

### Setup and Baseline Example

Here's a more comprehensive example with shared setup data and baseline comparison:

```typescript
import { parseBenchArgs, runBenchmarks, defaultReport, type BenchGroup, type BenchSuite } from 'bencher';

const sortingGroup: BenchGroup<number[]> = {
  name: "Array Sorting (1000 numbers)",
  setup: () => Array.from({ length: 1000 }, () => Math.random()),
  baseline: { name: "native sort", fn: nativeSort },
  benchmarks: [
    { name: "quicksort", fn: quickSort },
    { name: "insertion sort", fn: insertionSort },
  ],
};

const suite: BenchSuite = {
  name: "Performance Tests",
  groups: [sortingGroup],
};

const args = parseBenchArgs();
const results = await runBenchmarks(suite, args);
const report = defaultReport(results, args);
console.log(report);
```

See `examples/simple-cli.ts` for a complete runnable example.

## CLI Options

- `--time <seconds>` - Benchmark duration per test (default: 0.642s)
- `--filter <pattern>` - Run only benchmarks matching regex/substring
- `--runner <type>` - Choose runner: mitata (default), tinybench, or basic
- `--observe-gc` - Monitor garbage collection (default: true)
- `--worker` - Run benchmarks in isolated worker processes
- `--profile` - Run once for profiling (forces basic runner, single iteration)
- `--help` - Show all available options

## CLI Usage

### Filter benchmarks by name

```bash
simple-cli.ts --filter "concat"
simple-cli.ts --filter "^parse" --time 2
```

### Profiling with external debuggers

Use `--profile` to run benchmarks once for attaching external profilers:

```bash
# Use with Chrome DevTools profiler
node --inspect-brk simple-cli.ts --profile

# Use with other profiling tools
node --prof simple-cli.ts --profile
```

The `--profile` flag forces the basic runner to execute exactly one iteration with no warmup, making it ideal for debugging and performance profiling.

### Key Concepts

**Setup Functions**: Run once per group and provide shared data to all benchmarks in that group. The data returned by setup is automatically passed as the first parameter to benchmark functions that expect it.

**Baseline Comparison**: When a baseline is specified, all benchmarks in the group show percentage differences (Δ%) compared to baseline. 

## Output

Results are displayed in a formatted table:

```
╔═════════════════╤════════════════════════════════════════════╤═══════╤══════════════╗
║                 │                    time                    │       │   gc time    ║
║                 │                                            │       │              ║
║ name            │ mean  Δ%       p50   Δ%       p99   Δ%     │ runs  │ mean  Δ%     ║
╟─────────────────┼────────────────────────────────────────────┼───────┼──────────────╢
║ quicksort       │ 0.16  +9.7%    0.15  +7.2%    0.27  +18.0% │ 4,399 │ 0.5%  +74.8% ║
║ insertion sort  │ 0.30  +104.0%  0.32  +129.0%  0.35  +52.9% │ 2,340 │ 0.3%  -10.9% ║
║ --> native sort │ 0.15           0.14           0.23         │ 4,835 │ 0.3%         ║
╚═════════════════╧════════════════════════════════════════════╧═══════╧══════════════╝
```


## Requirements

- Node.js 22.6+ (for native TypeScript support)
- Use `--expose-gc --allow-natives-syntax` flags for garbage collection monitoring and V8 native functions

## Understanding GC Time Measurements

### GC Duration in Node.js Performance Hooks

The `duration` field in GC PerformanceEntry records **stop-the-world pause time** - the time when JavaScript execution is actually blocked. This does NOT include:

1. **Concurrent GC work** done in parallel threads (concurrent marking, sweeping)
2. **Performance degradation** from CPU contention and cache effects
3. **Total GC overhead** including preparation and cleanup

### Key Findings

1. **Multiple GC Events**: A single `gc()` call can trigger multiple GC events that are recorded separately
2. **Incremental GC**: V8 breaks up GC work into smaller increments to reduce pause times
3. **Duration < Impact**: The recorded duration is often much less than the actual performance impact
