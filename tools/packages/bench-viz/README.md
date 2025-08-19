# Benchmark Visualization

Visualizing benchmark data with interactive charts.

## Features

- 📊 **Histogram Distribution** - Frequency distribution of execution times
- 📈 **Time Series** - Sample values over iterations with outlier detection
- 📉 **Q-Q Plots** - Normality testing for benchmark distributions
- 📋 **Statistical Summary** - Min, max, mean, median, percentiles

## Development Setup

```bash
cd tools/packages/bench-viz
pnpm install
pnpm dev    # → http://localhost:3000
```

## Usage with Benchmarks

### 1. Run Simple Benchmarks with JSON Export
```bash
cd tools/packages/bencher
./examples/simple-cli.ts --time 0.1 --json ../bench-viz/public/data/benchmark-results.json
```

### 2. Run WESL Benchmarks with JSON Export
```bash
cd tools/packages/wesl-bench
pnpm bench --filter bevy --baseline --json ../bench-viz/public/data/benchmark-results.json --time 0.1
```

### 3. View Visualizations
- Open http://localhost:3000 in your browser
- Visualization auto-updates when JSON file changes
- Charts show real statistical analysis of your benchmark data

## Data Format

The visualization expects JSON in this format:

```typescript
{
  "meta": {
    "timestamp": "2025-08-10T05:48:09.420Z",
    "environment": { "node": "v24.4.0", "platform": "darwin" }
  },
  "suites": [
    {
      "name": "Benchmark Suite",
      "groups": [
        {
          "name": "Group Name",
          "baseline": { /* baseline benchmark */ },
          "benchmarks": [
            {
              "name": "benchmark-name",
              "samples": [0.145, 0.156, 0.142, ...],  // Raw timing data
              "time": { "min": 0.142, "max": 0.189, "mean": 0.156, ... },
              "execution": { "iterations": 1000, "totalTime": 2.5 }
            }
          ]
        }
      ]
    }
  ]
}
```

## Development Workflow

```bash
# Terminal 1: Start visualization server
cd tools/packages/bench-viz
pnpm dev

# Terminal 2: Run benchmarks (auto-updates visualization)
cd tools/packages/wesl-bench
pnpm bench --json ../bench-viz/public/data/benchmark-results.json --time 0.5

# Make changes to benchmark → JSON updates → Vite auto-refreshes → Charts update
```

## Architecture

- **Vite + TypeScript** - Modern development experience with HMR
- **Observable Plot + D3** - Powerful data visualization library
- **Modular Components** - Separate chart classes for different visualizations
- **Statistical Analysis** - Built-in outlier detection, Q-Q analysis, percentiles

## Chart Types

### Histogram Chart
- Shows frequency distribution of execution times
- Automatically bins data and excludes extreme outliers
- Color-coded by benchmark variant
- Built-in legend

### Time Series Chart  
- Plots each sample in collection order
- Shows timing trends and stability
- Highlights outliers and baseline comparisons
- Smart Y-axis scaling (doesn't start at 0)

### Q-Q Plot
- Tests if data follows normal distribution
- Points should align with diagonal if normal
- Helps validate statistical assumptions
- One plot per benchmark variant
