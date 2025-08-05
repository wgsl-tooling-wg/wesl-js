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
import { runBenchCLI, type BenchSuite } from 'bencher';

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

runBenchCLI(suite);
```

### Setup and Baseline Example

Here's a more comprehensive example with shared setup data and baseline comparison:

```typescript
import { runBenchCLI, type BenchGroup, type BenchSuite } from 'bencher';

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

runBenchCLI(suite);
```

Run your benchmarks:

```bash
node --expose-gc your-benchmark.ts
```

See `examples/simple-cli.ts` for a complete runnable example.

## CLI Options

- `--time <seconds>` - Benchmark duration per test (default: 0.642s)
- `--filter <pattern>` - Run only benchmarks matching regex/substring
- `--runner <type>` - Choose runner: mitata (default), tinybench, or basic
- `--observe-gc` - Monitor garbage collection (default: true)
- `--worker` - Run benchmarks in isolated worker processes
- `--help` - Show all available options

## CLI Usage

### Filter benchmarks by name

```bash
node --expose-gc bench.ts --filter "concat"
node --expose-gc bench.ts --filter "^parse" --time 2
```

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
- Use `--expose-gc` flag for garbage collection monitoring