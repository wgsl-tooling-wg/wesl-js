import pico from "picocolors";
const { red, green } = pico;


/** Formatting utilities for table data */

/** Format floats with 2 decimal places */
export function floatDefault(x: number | undefined): string | null {
  return float(x, 2);
}

/** Format floats with custom precision */
export function floatPrecision(precision: number) {
  return (x: number | undefined) => float(x, precision);
}

/** Format duration in milliseconds */
export function duration(ms: number | undefined): string | null {
  if (ms === undefined) return null;
  if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format bytes with appropriate units */
export function bytes(bytes: number | undefined): string | null {
  if (bytes === undefined) return null;
  const units = ["b", "kb", "mb", "gb", "tb"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/** Format as a rate (value per unit) */
export function rate(unit: string) {
  return (value: number | undefined) => {
    if (value === undefined) return null;
    return `${integer(value)}/${unit}`;
  };
}

/** format an integer with commas between thousands */
export function integer(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

/** format a float to a specified precision with trailing zeros dropped */
export function float(
  x: number | undefined,
  digits: number,
): string | null {
  if (x === undefined || x === null) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}

/** format a number like .473 as a percentage like 47.3% */
export function percent(fraction?: number): string | null {
  if (fraction === undefined || fraction === null) return null;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** format a fraction as a colored +/- percentage */
export function coloredPercent(numerator: number, denominator: number): string {
  const fraction = numerator / denominator;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${percent(fraction)}`;
  return positive ? green(percentStr) : red(percentStr);
}
