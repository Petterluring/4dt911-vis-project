import { quantileSorted } from 'd3';
import type { ClusterPriceDistribution } from '../interfaces/clustering';

export const clusterNumber = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 1 });
export function formatClusterNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'Not available' : clusterNumber.format(value);
}
export function knownNonnegative(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value >= 0;
}
export function medianValue(values: (number | null)[]): number | null {
  return quantileSorted(values.filter(knownNonnegative).sort((a, b) => a - b), .5) ?? null;
}
// Tukey whiskers end at observed values within 1.5 IQR, not at the fences.
export function priceDistribution(values: (number | null)[]): ClusterPriceDistribution | null {
  const sorted = values.filter(knownNonnegative).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const q1 = quantileSorted(sorted, .25)!;
  const median = quantileSorted(sorted, .5)!;
  const q3 = quantileSorted(sorted, .75)!;
  const iqr = q3 - q1;
  const inliers = sorted.filter(value => value >= q1 - 1.5 * iqr && value <= q3 + 1.5 * iqr);
  return {
    count: sorted.length, lowerWhisker: inliers[0], q1, median, q3,
    upperWhisker: inliers[inliers.length - 1],
    outliers: sorted.filter(value => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr),
  };
}
export function validDistribution(value: ClusterPriceDistribution | null): value is ClusterPriceDistribution {
  if (!value || value.count < 1) return false;
  const ordered = [value.lowerWhisker, value.q1, value.median, value.q3, value.upperWhisker];
  return ordered.every((number, index) => knownNonnegative(number) && (index === 0 || number >= ordered[index - 1]));
}
