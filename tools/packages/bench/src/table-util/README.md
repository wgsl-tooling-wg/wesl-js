# TableReport 

Utilities for creating formatted text-based tables.
Under the hood, TableReport uses the npm [table](https://www.npmjs.com/package/table) library.

### Features

*   **Column Grouping:** Group related columns under a common header.
*   **Difference Columns:** Automatically generate columns that show the percentage difference between a value and a baseline value.
*   **Custom Formatting:** Declaratively provide custom formatters for columns.
*   **Simplified Configuration:** A higher-level API for the `table` library.

## `TableReport.ts`

The `buildTable` function in `TableReport.ts` is the main entry point for creating a table. 
It takes a configuration object for columns and an array of data records for rows.

### Example

Here's a simplified example of how to use `buildTable`:

```typescript
import { buildTable, ColumnGroup } from './TableReport';
import { integer, floatPrecision } from './Formatters';

interface MyData {
  name: string;
  value: number;
  score: number;
}

const data: MyData[] = [
  { name: 'test A', value: 123, score: 45.6 },
  { name: 'test B', value: 456, score: 78.9 },
];

const baselineData: MyData[] = [
  { name: 'test A', value: 100, score: 50.0 },
  { name: 'test B', value: 500, score: 75.0 },
];

const tableConfig: ColumnGroup<MyData>[] = [
  {
    columns: [{ key: 'name', title: 'Name' }],
  },
  {
    groupTitle: 'Metrics',
    columns: [
      { key: 'value', title: 'Value', formatter: integer },
      { key: 'value_diff', title: 'Δ%', diffKey: 'value' },
      { key: 'score', title: 'Score', formatter: floatPrecision(1) },
      { key: 'score_diff', title: 'Δ%', diffKey: 'score' },
    ],
  },
];

const table = buildTable(tableConfig, data, baselineData);
console.log(table);
```

For a more complex example, see `BenchmarkReport.ts`, specifically the `mostlyFullRow` and `tableConfig` variables.

## `Formatters.ts`

This file contains various utility functions for formatting numbers and strings, such as:

*   `float`, `integer`: Format numbers to a specific precision.
*   `percent`: Format a number as a percentage.
*   `diffPercent`, `diffPercentNegative`: Format the percentage difference between two numbers, with color-coding for positive/negative changes.
*   `bytes`, `duration`, `rate`: Format numbers with appropriate units.
