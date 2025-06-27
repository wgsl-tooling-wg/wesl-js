import pico from "picocolors";
const { red, green } = pico;

/** Common formatters for table columns */
export const Formatters = {
  /** Format integers with thousand separators */
  integer: (x: number | undefined) => prettyInteger(x),

  /** Format floats with 2 decimal places */
  float: (x: number | undefined) => prettyFloat(x, 2),

  /** Format floats with custom precision */
  floatPrecision: (precision: number) => (x: number | undefined) =>
    prettyFloat(x, precision),

  /** Format as percentage */
  percent: (x: number | undefined) => prettyPercent(x),

  /** Format duration in milliseconds */
  duration: (ms: number | undefined) => {
    if (ms === undefined) return null;
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },

  /** Format bytes with appropriate units */
  bytes: (bytes: number | undefined) => {
    if (bytes === undefined) return null;
    const units = ["b", "kb", "mb", "gb", "tb"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  },

  /** Format as a rate (value per unit) */
  rate: (unit: string) => (value: number | undefined) => {
    if (value === undefined) return null;
    return `${prettyInteger(value)}/${unit}`;
  },

  /** Truncate string to max length */
  truncate: (maxLength: number) => (str: string | undefined) => {
    if (str === undefined) return null;
    return str.length > maxLength ? `${str.slice(0, maxLength - 3)}...` : str;
  },
} as const;

/** Formatting utilities for table data */

/** format an integer with commas between thousands */
export function prettyInteger(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

/** format a float to a specified precision with trailing zeros dropped */
export function prettyFloat(
  x: number | undefined,
  digits: number,
): string | null {
  if (x === undefined) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}

/** format a number like .473 as a percentage like 47.3% */
export function prettyPercent(fraction?: number): string | null {
  if (fraction === undefined) return null;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** format a fraction as a colored +/- percentage */
export function coloredPercent(numerator: number, denominator: number): string {
  const fraction = numerator / denominator;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${prettyPercent(fraction)}`;
  return positive ? green(percentStr) : red(percentStr);
}
