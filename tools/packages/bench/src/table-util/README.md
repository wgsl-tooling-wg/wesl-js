# TableReport 

Utilities for creating formatted text-based tables with column groups and baseline comparisons.
Under the hood, TableReport uses the npm [table](https://www.npmjs.com/package/table) library.

### Features

*   **Column Grouping:** Group related columns under a common header.
*   **Baseline Comparisons:** Compare multiple result sets against baseline values with automatic diff columns.
*   **Custom Formatting:** Apply formatters to columns for consistent data presentation.
*   **Result Grouping:** Display multiple result groups with automatic spacing.

## `TableReport.ts`

The `buildTable` function in `TableReport.ts` is the main entry point for creating a table. 
It takes column groups configuration and result groups (with optional baselines).

### API

```typescript
buildTable<T>(
  columnGroups: ColumnGroup<T>[],
  resultGroups: ResultGroup<T>[],
  nameKey: keyof T = "name"
): string
```

### Example

Here's a simplified example of how to use `buildTable`:

```typescript
import { buildTable, ColumnGroup, ResultGroup } from './TableReport';
import { integer, floatPrecision } from './Formatters';

interface MyData {
  name: string;
  value: number;
  score: number;
}

const results: MyData[] = [
  { name: 'test A', value: 123, score: 45.6 },
  { name: 'test B', value: 456, score: 78.9 },
];

const baseline: MyData = { name: 'baseline', value: 100, score: 50.0 };

const columnGroups: ColumnGroup<MyData>[] = [
  {
    columns: [{ key: 'name', title: 'Name' }],
  },
  {
    groupTitle: 'Metrics',
    columns: [
      { key: 'value', title: 'Value', formatter: integer },
      { key: 'value_diff' as any, title: 'Δ%', diffKey: 'value' },
      { key: 'score', title: 'Score', formatter: floatPrecision(1) },
      { key: 'score_diff' as any, title: 'Δ%', diffKey: 'score' },
    ],
  },
];

const resultGroups: ResultGroup<MyData>[] = [
  { results, baseline }
];

const table = buildTable(columnGroups, resultGroups);
console.log(table);
```

### Key Types

- **ColumnGroup**: Groups columns under an optional header
- **Column**: Regular data column with optional formatter
- **DiffColumn**: Comparison column that calculates difference from baseline (specify `diffKey`)
- **ResultGroup**: Contains results array and optional baseline for comparison

For a more complex example, see `BenchmarkReport.ts`.

## `Formatters.ts`

This file contains various utility functions for formatting table data:

*   `integer`: Format numbers with thousand separators (e.g., 1,234).
*   `floatPrecision(n)`: Returns a formatter for floats with n decimal places.
*   `percentPrecision(n)`: Returns a formatter for percentages with n decimal places.
*   `percent`: Format a decimal as a percentage (e.g., 0.473 → 47.3%).
*   `duration`: Format milliseconds with appropriate units (μs, ms, s).
*   `rate(unit)`: Returns a formatter for rates (e.g., "123/sec").
*   `diffPercent`: Calculate and format percentage difference with color coding (green for positive, red for negative).
