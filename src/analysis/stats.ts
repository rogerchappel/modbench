/**
 * modbench - Statistical analysis
 * Computes mean, median, stdDev, percentiles from a number array.
 */

export function percentile(values: number[], p: number): number {
  if (!Number.isFinite(p) || p < 0 || p > 100) {
    throw new RangeError("percentile must be a finite number between 0 and 100");
  }
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sortedValues = [...values].sort((a, b) => a - b);
  return percentileSorted(sortedValues, p);
}

function percentileSorted(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  return percentile(values, 50);
}

export function stdDev(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const sqDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export function computeSummary(values: number[]): {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    mean: mean(values),
    median: percentileSorted(sorted, 50),
    stdDev: stdDev(values),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    p50: percentileSorted(sorted, 50),
    p95: percentileSorted(sorted, 95),
    p99: percentileSorted(sorted, 99),
  };
}
