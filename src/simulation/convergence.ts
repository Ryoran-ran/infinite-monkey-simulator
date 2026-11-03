import type { SampleStatistics } from '../types/simulation'

export function relativeErrorPercent(mean: number | null, expected: bigint): number | null {
  const theory = Number(expected)
  if (mean === null || !Number.isFinite(mean) || !Number.isFinite(theory) || theory <= 0) return null
  return (mean / theory - 1) * 100
}

export function convergenceData(statistics: SampleStatistics) {
  return statistics.convergence.map(point => ({ ...point, count: Number(point.experiments) }))
}

export function formatRelativeError(percent: number | null): string {
  if (percent === null) return '—'
  return `${percent > 0 ? '+' : ''}${percent.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}
