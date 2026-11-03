import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnlineStatistics } from './statistics'
import { CONVERGENCE_POINT_LIMIT } from './config'
import { convergenceData, formatRelativeError, relativeErrorPercent } from './convergence'
import { emptyProgress, SimulationEngine } from './engine'
import { exportCsv } from './csv'
import { StatisticsChart } from '../components/StatisticsChart'
import { ConvergenceSummary } from '../components/ConvergenceChart'

function addValues(stats: OnlineStatistics, values: number[]) {
  let total = 0
  for (const [i, value] of values.entries()) {
    total += value
    stats.add({ experiment: `${i + 1}`, characters: `${value}`, totalCharacters: `${total}` })
  }
}

describe('Cumulative mean convergence', () => {
  it('starts with no invented observations and records the true mean at each completion', () => {
    const stats = new OnlineStatistics()
    expect(stats.snapshot().convergence).toEqual([])
    addValues(stats, [4, 8, 2, 10])
    const points = stats.snapshot().convergence
    expect(points.map(p => p.experiments)).toEqual(['1', '2', '3', '4'])
    expect(points[0].mean).toBe(4)
    expect(points[1].mean).toBe(6)
    expect(points[2].mean).toBeCloseTo(14 / 3)
    expect(points[3].mean).toBe(6)
  })
  it('bounds the curve and preserves the initial, latest and true historic cumulative means', () => {
    const stats = new OnlineStatistics(3)
    let total = 0
    for (let count = 1; count <= 20_003; count++) {
      total += count
      stats.add({ experiment: `${count}`, characters: `${count}`, totalCharacters: `${total}` })
      if (count % 127 === 0 || count === 20_003) {
        const result = stats.snapshot()
        expect(result.convergence.length).toBeLessThanOrEqual(CONVERGENCE_POINT_LIMIT)
        expect(result.convergence[0]).toEqual({ experiments: '1', mean: 1 })
        expect(result.convergence.at(-1)).toEqual({ experiments: `${count}`, mean: (count + 1) / 2 })
        const counts = result.convergence.map(p => BigInt(p.experiments))
        expect(new Set(counts).size).toBe(counts.length)
        for (let i = 0; i < counts.length; i++) {
          expect(result.convergence[i].mean).toBe((Number(counts[i]) + 1) / 2)
          if (i) expect(counts[i]).toBeGreaterThan(counts[i - 1])
        }
        expect(result.samples).toHaveLength(Math.min(3, count))
      }
    }
    // Median uses the recent window, while the convergence mean uses all 20,003 experiments.
    const snapshot = stats.snapshot(false)
    expect(snapshot.windowed).toBe(true)
    expect(snapshot.median).toBe(20_002)
    expect(snapshot.mean).toBe(10_002)
    expect(snapshot.convergence.at(-1)?.mean).toBe(10_002)
    expect(snapshot.samples).toEqual([])
  })
  it('does not allow callers to mutate stored historical means', () => {
    const stats = new OnlineStatistics()
    addValues(stats, [4, 6])
    stats.snapshot().convergence[0].mean = -100
    expect(stats.snapshot().convergence[0].mean).toBe(4)
  })
  it('reports signed relative errors against the expectation', () => {
    expect(relativeErrorPercent(10, 10n)).toBe(0)
    expect(relativeErrorPercent(12, 10n)).toBeCloseTo(20)
    expect(relativeErrorPercent(8, 10n)).toBeCloseTo(-20)
    expect(relativeErrorPercent(null, 10n)).toBeNull()
    expect(relativeErrorPercent(1, 0n)).toBeNull()
    expect(relativeErrorPercent(1, 10n ** 400n)).toBeNull()
    expect(formatRelativeError(20)).toBe('+20.00%')
    expect(formatRelativeError(-20)).toBe('-20.00%')
    expect(formatRelativeError(0)).toBe('0.00%')
    expect(formatRelativeError(null)).toBe('—')
  })
  it('maps exact experiment counts for axis data and retains the first real point at 1', () => {
    const stats = new OnlineStatistics()
    addValues(stats, [4, 8, 6])
    const data = convergenceData(stats.snapshot(false))
    expect(data).toEqual([
      { experiments: '1', count: 1, mean: 4 },
      { experiments: '2', count: 2, mean: 6 },
      { experiments: '3', count: 3, mean: 6 },
    ])
  })
  it('includes all-completion cumulative means in CSV alongside the expectation and errors', () => {
    const engine = new SimulationEngine({ target: 'ABA', alphabet: 'AB', seed: 42, mode: 'continuous', speed: 'standard', monitor: false, batchSize: 1000, reportInterval: 150 }, () => 0)
    engine.processBatch(1000)
    const stats = engine.statistics.snapshot(false)
    const csv = exportCsv(engine, 100)
    expect(csv).toContain('"completed_experiments","cumulative_mean_characters","theoretical_expected_characters","relative_error_percent"')
    const last = stats.convergence.at(-1)!
    expect(last.experiments).toBe(stats.count)
    expect(last.mean).toBe(stats.mean)
    expect(csv).toContain(`"${last.experiments}","${last.mean}","10","${relativeErrorPercent(last.mean, 10n)}"`)
  })
  it('shows the convergence view by default for continuous experiments, with a useful empty state', () => {
    const html = renderToStaticMarkup(createElement(StatisticsChart, { progress: emptyProgress(), targetLength: 3, expected: 10n, mode: 'continuous' }))
    expect(html).toContain('期待値への収束')
    expect(html).toContain('累積平均')
    expect(html).toContain('理論値との相対誤差')
    expect(html).toContain('ABA お試し')
    expect(html).toContain('完了した実験回数')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
  })
  it('preserves the match-progress default for single experiments', () => {
    const html = renderToStaticMarkup(createElement(StatisticsChart, { progress: emptyProgress(), targetLength: 3, expected: 10n, mode: 'single' }))
    expect(html).toContain('最長一致の推移')
    expect(html).not.toContain('理論値との相対誤差')
  })
  it('renders measured mean, theoretical expectation and error together', () => {
    const stats = new OnlineStatistics()
    addValues(stats, [8, 16])
    const html = renderToStaticMarkup(createElement(ConvergenceSummary, { statistics: stats.snapshot(false), expected: 10n }))
    expect(html).toContain('12')
    expect(html).toContain('10')
    expect(html).toContain('+20.00%')
  })
})
