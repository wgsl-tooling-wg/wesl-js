import type { OutlierInfo, QQPoint } from "../data/VizTypes.ts";

/** @return Q-Q plot points comparing samples to normal distribution */
export function calculateQQData(samples: number[]): QQPoint[] {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = calcMean(sorted);
  const stdDev = calcStdDev(sorted, mean);

  const standardized = sorted.map(x => (x - mean) / stdDev);

  return standardized.map((value, i) => {
    const p = (i + 0.5) / n;
    const theoretical = normalInverse(p, 0, 1);
    return {
      sample: value * stdDev + mean, // back to original scale
      theoretical: theoretical * stdDev + mean,
    };
  });
}

/** @return outliers using 1.5 * IQR fence method */
export function detectOutliers(samples: number[]): OutlierInfo {
  const sorted = [...samples].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = samples
    .map((value, iteration) => ({ value, iteration }))
    .filter(d => d.value < lowerBound || d.value > upperBound);

  return { outliers, lowerBound, upperBound };
}

/** @return arithmetic mean */
function calcMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/** @return population standard deviation */
function calcStdDev(values: number[], mean?: number): number {
  const m = mean ?? calcMean(values);
  const squaredDiffs = values.map(val => (val - m) ** 2);
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

/** @return linearly interpolated percentile */
function percentile(sorted: number[], p: number): number {
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

const normalInverseCoeffs = {
  a: [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ],
  b: [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ],
  c: [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ],
  d: [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ],
  thresholds: { low: 0.02425, high: 0.97575 },
};

/** @return polynomial value using Horner's method */
function evaluatePolynomial(coeffs: number[], x: number): number {
  return coeffs.reduce((sum, coeff, i) => sum + coeff * x ** i, 0);
}

/** @return z-score for tail regions */
function calcTailZ(q: number, c: number[], d: number[]): number {
  const numerator = evaluatePolynomial([...c].reverse(), q);
  const denominator = evaluatePolynomial([...d, 1].reverse(), q);
  return numerator / denominator;
}

/** @return z-score for central region */
function calcCentralZ(q: number, r: number, a: number[], b: number[]): number {
  const numerator = q * evaluatePolynomial([...a].reverse(), r);
  const denominator = evaluatePolynomial([...b, 1].reverse(), r);
  return numerator / denominator;
}

/** @return inverse normal CDF with < 3e-7 error */
function normalInverse(p: number, mean: number, stdDev: number): number {
  const { low, high } = normalInverseCoeffs.thresholds;
  const { a, b, c, d } = normalInverseCoeffs;

  let z: number;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    z = calcTailZ(q, c, d);
  } else if (p <= high) {
    const q = p - 0.5;
    const r = q * q;
    z = calcCentralZ(q, r, a, b);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -calcTailZ(q, c, d);
  }

  return mean + stdDev * z;
}
