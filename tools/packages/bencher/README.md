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

### HTML

  The HTML report should now display:
  - Histogram + KDE: Bar chart with a line overlay showing the distribution
  - Violin Plot: Distribution shape comparison between benchmarks
  - Time Series: Sample values over iterations with outliers marked in red
  - Q-Q Plots: For testing normality of the distributions


## Requirements

- Node.js 22.6+ (for native TypeScript support)
- Use `--expose-gc --allow-natives-syntax` flags for garbage collection monitoring and V8 native functions

## Adaptive Mode

Adaptive mode automatically adjusts the number of benchmark iterations to achieve a desired confidence interval, providing statistically significant results without excessive runtime.

### Using Adaptive Mode

```bash
# Enable adaptive benchmarking with default settings
simple-cli.ts --adaptive

# Customize confidence parameters
simple-cli.ts --adaptive --threshold 0.02 --confidence 0.99 --max-time 60

# Combine with other options
simple-cli.ts --adaptive --worker --filter "sort"
```

### CLI Options for Adaptive Mode

- `--adaptive` - Enable adaptive sampling mode
- `--threshold <fraction>` - Target confidence interval width (default: 0.03 = ±3%)
- `--confidence <level>` - Confidence level for intervals (default: 0.95 = 95%)
- `--max-time <seconds>` - Maximum time per benchmark (default: 30s)

### How It Works

1. **Initial Sampling**: Runs benchmark for minimum time to collect initial samples
2. **Statistical Analysis**: Calculates mean and confidence interval using Student's t-distribution
3. **Convergence Check**: Continues sampling until CI width < threshold or max-time reached
4. **Early Termination**: Stops when statistical significance achieved, saving time

### Output with Adaptive Mode

```
╔═══════════════╤═════════════════════════════╤═══════╤═══════╗
║               │            time             │       │       ║
║ name          │ mean    ±CI      p50        │ runs  │ time  ║
╟───────────────┼─────────────────────────────┼───────┼───────╢
║ quicksort     │ 0.16ms  ±2.1%   0.15ms     │ 4,823 │ 3.2s  ║
║ native sort   │ 0.14ms  ±1.8%   0.14ms     │ 5,421 │ 2.8s  ║
╚═══════════════╧═════════════════════════════╧═══════╧═══════╝
```

The `±CI` column shows the confidence interval as a percentage of the mean. Lower percentages indicate more reliable measurements.

## Statistical Considerations: Mean vs Median

### When to Use Mean with Confidence Intervals

**Best for:**
- **Normally distributed data** - When benchmark times follow a bell curve
- **Statistical comparison** - Comparing performance between implementations
- **Throughput analysis** - Understanding average system performance
- **Resource planning** - Estimating typical resource usage

**Advantages:**
- Provides confidence intervals for statistical significance
- Captures the full distribution including outliers
- Better for detecting small but consistent performance differences
- Standard in academic performance research

**Example use cases:**
- Comparing algorithm implementations
- Measuring API response times under normal load
- Evaluating compiler optimizations
- Benchmarking pure computational functions

### When to Use Median (p50)

**Best for:**
- **Skewed distributions** - When outliers are common
- **Latency-sensitive applications** - Where typical user experience matters
- **Noisy environments** - Systems with unpredictable interference
- **Service Level Agreements** - "50% of requests complete within X ms"

**Advantages:**
- Robust to outliers and system noise
- Better represents "typical" performance
- More stable in virtualized/cloud environments
- Less affected by GC pauses and OS scheduling

**Example use cases:**
- Web server response times
- Database query performance
- UI responsiveness metrics
- Real-time system benchmarks

### Interpreting Results

#### With Adaptive Mode (Mean + CI)
```
mean: 0.16ms ±2.1%
```
This means we're 95% confident the true mean lies between 0.157ms and 0.163ms. Use this when you need statistical rigor and are comparing implementations.

#### With Traditional Mode (Percentiles)
```
p50: 0.15ms, p99: 0.27ms
```
This shows that 50% of runs completed in ≤0.15ms and 99% in ≤0.27ms. Use this when you care about consistency and tail latencies.

### Practical Guidelines

1. **Use adaptive mode (mean + CI) when:**
   - Running in controlled environments
   - Comparing similar implementations
   - Making optimization decisions
   - Publishing benchmark results

2. **Use median/percentiles when:**
   - Running in production-like environments
   - Measuring user-facing latencies
   - System has unpredictable load
   - GC or other pauses are unavoidable

3. **Consider both when:**
   - Doing comprehensive performance analysis
   - Large difference between mean and median indicates skew
   - Debugging performance issues
   - Setting performance targets

### Statistical Notes

- **Student's t-distribution**: Used for confidence intervals when sample size is small (< 30) or population variance unknown
- **Confidence Level**: 95% means if we repeated the benchmark many times, 95% of the calculated intervals would contain the true mean
- **Sample Size**: Adaptive mode automatically determines optimal sample size based on variance
- **Independence**: Assumes benchmark iterations are independent (use `--worker` flag for better isolation)

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
