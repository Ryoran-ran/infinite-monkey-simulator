import type { ConvergencePoint, ExperimentResult, SampleStatistics } from '../types/simulation'
import { CONVERGENCE_POINT_LIMIT, SAMPLE_LIMIT } from './config'

export class OnlineStatistics {
  count = 0n
  private mean = 0
  private m2 = 0
  private min: bigint | null = null
  private max: bigint | null = null
  private samples: ExperimentResult[] = []
  private cursor = 0
  private meanHistory: ConvergencePoint[] = []
  private historyStride = 1n
  constructor(readonly limit = SAMPLE_LIMIT) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid sample limit')
  }
  add(result: ExperimentResult): void {
    const exact = BigInt(result.characters)
    const value = Number(exact)
    this.count++
    const delta = value - this.mean
    this.mean += delta / Number(this.count)
    this.m2 += delta * (value - this.mean)
    if (this.count === 1n || this.count % this.historyStride === 0n) {
      this.meanHistory.push({ experiments: this.count.toString(), mean: this.mean })
      // Keep the first observation and evenly spaced checkpoints. Reserve one slot
      // for the latest mean, even between checkpoints. All means use all successes.
      if (this.meanHistory.length >= CONVERGENCE_POINT_LIMIT) {
        this.historyStride *= 2n
        this.meanHistory = this.meanHistory.filter(point => point.experiments === '1' || BigInt(point.experiments) % this.historyStride === 0n)
      }
    }
    this.min = this.min === null || exact < this.min ? exact : this.min
    this.max = this.max === null || exact > this.max ? exact : this.max
    if (this.samples.length < this.limit) this.samples.push(result)
    else { this.samples[this.cursor] = result; this.cursor = (this.cursor + 1) % this.limit }
  }
  snapshot(includeSamples = true): SampleStatistics {
    const ordered = this.samples.length < this.limit ? this.samples.slice() : [...this.samples.slice(this.cursor), ...this.samples.slice(0, this.cursor)]
    const sorted = ordered.map(s => Number(s.characters)).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : null
    const convergence = this.meanHistory.map(point => ({ ...point }))
    if (this.count && convergence.at(-1)?.experiments !== this.count.toString()) {
      convergence.push({ experiments: this.count.toString(), mean: this.mean })
    }
    return {
      count: this.count.toString(), min: this.min?.toString() ?? null, max: this.max?.toString() ?? null,
      mean: this.count ? this.mean : null,
      standardDeviation: this.count > 1n ? Math.sqrt(Math.max(0, this.m2 / Number(this.count - 1n))) : null,
      median, samples: includeSamples ? ordered : [], sampleLimit: this.limit, sampleCount: ordered.length,
      windowed: this.count > BigInt(this.limit),
      histogramLinear: buildHistogram(ordered, false), histogramLog: buildHistogram(ordered, true),
      convergence,
    }
  }
}

export interface HistogramBin { label: string; count: number; start: number; end: number }
export function buildHistogram(samples: ExperimentResult[], log: boolean): HistogramBin[] {
  if (!samples.length) return []
  const values = samples.map(s => Number(s.characters))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const transform = log ? Math.log10 : (n: number) => n
  const inverse = log ? (n: number) => 10 ** n : (n: number) => n
  const low = transform(min)
  const high = transform(max)
  const count = min === max ? 1 : Math.min(12, Math.max(4, Math.ceil(Math.sqrt(values.length))))
  const width = (high - low) / count || 1
  const bins = Array.from({ length: count }, (_, i) => {
    const start = inverse(low + i * width)
    const end = i === count - 1 ? max : inverse(low + (i + 1) * width)
    return { label: `${start.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}–${end.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`, count: 0, start, end }
  })
  for (const value of values) bins[Math.min(count - 1, Math.floor((transform(value) - low) / width))].count++
  return bins
}
