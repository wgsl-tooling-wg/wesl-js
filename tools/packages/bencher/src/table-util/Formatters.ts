import pico from "picocolors";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const { red, green } = isTest
  ? { red: (str: string) => str, green: (str: string) => str }
  : pico;

/** Format floats with custom precision */
export function floatPrecision(
  precision: number,
): (x: unknown) => string | null {
  return (x: unknown) => {
    if (typeof x !== "number") return null;
    return x.toFixed(precision).replace(/\.?0+$/, "");
  };
}

/** Format percentages with custom precision */
export function percentPrecision(
  precision: number,
): (x: unknown) => string | null {
  return (x: unknown) => {
    if (typeof x !== "number") return null;
    return percent(x, precision);
  };
}

/** Format duration in milliseconds with appropriate units */
export function duration(ms: unknown): string | null {
  if (typeof ms !== "number") return null;
  if (ms < 0.001) return `${(ms * 1000000).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format time in milliseconds, showing very small values with units */
export function timeMs(ms: unknown): string | null {
  if (typeof ms !== "number") return null;
  if (ms < 0.001) return `${(ms * 1000000).toFixed(0)}ns`;
  if (ms < 0.01) return `${(ms * 1000).toFixed(1)}μs`;
  if (ms >= 10) return ms.toFixed(0);
  return ms.toFixed(2);
}

/** Format as rate (value per unit) */
export function rate(unit: string) {
  return (value: unknown) => {
    if (typeof value !== "number") return null;
    return `${integer(value)}/${unit}`;
  };
}

/** Format integer with thousand separators */
export function integer(x: unknown): string | null {
  if (typeof x !== "number") return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

/** Format fraction as percentage (0.473 → 47.3%) */
export function percent(fraction: unknown, precision = 1): string | null {
  if (typeof fraction !== "number") return null;
  return `${Math.abs(fraction * 100).toFixed(precision)}%`;
}

export function diffPercent(main: unknown, base: unknown): string {
  if (typeof main !== "number" || typeof base !== "number") return " ";
  const diff = main - base;
  return coloredPercent(diff, base);
}

/** Format percentage difference for benchmarks (lower is better) */
export function diffPercentBenchmark(main: unknown, base: unknown): string {
  if (typeof main !== "number" || typeof base !== "number") return " ";
  const diff = main - base;
  return coloredPercent(diff, base, false); // negative is good for benchmarks
}

/** Format fraction as colored +/- percentage */
function coloredPercent(
  numerator: number,
  denominator: number,
  positiveIsGreen = true,
): string {
  const fraction = numerator / denominator;
  if (Number.isNaN(fraction) || !Number.isFinite(fraction)) {
    return " ";
  }
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${percent(fraction)}`;
  const isGood = positive === positiveIsGreen;
  return isGood ? green(percentStr) : red(percentStr);
}
