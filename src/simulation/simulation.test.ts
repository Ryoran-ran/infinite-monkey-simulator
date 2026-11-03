import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, getAlphabet, makeConfig, MONITOR_LIMIT, uniqueAlphabet, validateConfig } from './config'
import { SimulationEngine } from './engine'
import { StreamMatcher } from './matcher'
import { SeededRandom } from './random'
import { expectedWaitingTime } from './theoretical'
import { buildHistogram, OnlineStatistics } from './statistics'
import { exactNumber, scientific } from './format'
import { exportCsv } from './csv'
import type { SimulationConfig } from '../types/simulation'

export const testConfig = (overrides: Partial<SimulationConfig> = {}): SimulationConfig => ({
  target: 'ABA', alphabet: 'AB', seed: 42, mode: 'single', speed: 'standard', monitor: true,
  batchSize: 100_000, reportInterval: 150, ...overrides,
})
function runEngine(config: SimulationConfig, batchSize: number, max = 100_000) {
  const engine = new SimulationEngine(config, () => 0)
  for (let n = 0; n < max && !engine.complete; n += batchSize) engine.processBatch(Math.min(batchSize, max - n))
  return engine
}

describe('Phase 1: seeded generation, validation and streaming matching', () => {
  it('reproduces exactly with the same seed, including zero', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const a = new SeededRandom(seed)
      const b = new SeededRandom(seed)
      expect(Array.from({ length: 1000 }, () => a.nextUint32())).toEqual(Array.from({ length: 1000 }, () => b.nextUint32()))
    }
  })
  it('generates only the selected alphabet with no large deterministic bias', () => {
    const rng = new SeededRandom(100)
    const counts = new Array<number>(26).fill(0)
    let invalid = 0
    for (let i = 0; i < 260_000; i++) {
      const n = rng.index(26)
      if (n < 0 || n >= 26 || !Number.isInteger(n)) invalid++
      counts[n]++
    }
    expect(invalid).toBe(0)
    for (const count of counts) expect(Math.abs(count - 10_000)).toBeLessThan(600)
  })
  it('detects the supplied BBABABA example at positions 5 and 7', () => {
    const matcher = new StreamMatcher('ABA')
    const matches: number[] = []
    const lengths = [...'BBABABA'].map((character, index) => {
      const length = matcher.push(character)
      if (length === 3) matches.push(index + 1)
      return length
    })
    expect(matches).toEqual([5, 7])
    expect(Math.max(...lengths)).toBe(3)
  })
  it('falls back through self-overlap correctly', () => {
    const matcher = new StreamMatcher('AABAAB')
    const matches: number[] = []
    ;[...'AAABAABAAB'].forEach((c, i) => { if (matcher.push(c) === 6) matches.push(i + 1) })
    expect(matches).toEqual([7, 10])
  })
  it('matches a naive streaming oracle for many generated patterns', () => {
    const random = new SeededRandom(27)
    for (let test = 0; test < 100; test++) {
      const target = Array.from({ length: 1 + random.index(8) }, () => 'ABC'[random.index(3)]).join('')
      const stream = Array.from({ length: 500 }, () => 'ABC'[random.index(3)]).join('')
      const matcher = new StreamMatcher(target)
      for (let i = 0; i < stream.length; i++) {
        const matched = matcher.push(stream[i])
        expect(matched === target.length).toBe(stream.slice(0, i + 1).endsWith(target))
      }
    }
  })
  it('counts the exact first full match regardless of batch size', () => {
    const config = testConfig()
    const one = runEngine(config, 1)
    const batched = runEngine(config, 10_000)
    expect(batched.complete).toBe(true)
    expect(batched.totalCharacters).toBe(one.totalCharacters)
    const rng = new SeededRandom(config.seed)
    let stream = ''
    while (!stream.endsWith(config.target)) stream += config.alphabet[rng.index(2)]
    expect(batched.totalCharacters).toBe(BigInt(stream.length))
    expect(batched.experimentCharacters).toBe(batched.totalCharacters)
    expect(batched.statistics.count).toBe(1n)
    expect(batched.processBatch(1000)).toBe(0)
  })
  it('deduplicates custom alphabets, preserving spaces and case', () => {
    expect(uniqueAlphabet('AAB BAa')).toBe('AB a')
    expect(getAlphabet({ ...DEFAULT_SETTINGS, preset: 'custom', customAlphabet: 'AABBA' })).toBe('AB')
    expect(getAlphabet(DEFAULT_SETTINGS)).toHaveLength(26)
  })
  it.each([
    { target: '' }, { target: 'A'.repeat(257) }, { alphabet: 'AAAA' },
    { target: 'a' }, { target: '日本語' }, { seed: -1 }, { seed: 2 ** 32 }, { seed: 1.2 },
    { speed: 'invalid' as SimulationConfig['speed'] }, { batchSize: 0 }, { reportInterval: 99 },
  ])('rejects invalid configuration %o', overrides => {
    const config = testConfig(overrides)
    expect(validateConfig(config).length).toBeGreaterThan(0)
    expect(() => new SimulationEngine(config)).toThrow()
  })
  it('accepts 0 and the largest uint32 seed, rejects non-integer text', () => {
    for (const seed of ['0', '4294967295', '']) expect(validateConfig(makeConfig({ ...DEFAULT_SETTINGS, seed }, 5))).toEqual([])
    for (const seed of ['-1', '1.0', '1e2', 'NaN', '4294967296', ' ']) expect(validateConfig(makeConfig({ ...DEFAULT_SETTINGS, seed }, 5)).length).toBeGreaterThan(0)
  })
})

describe('Phase 2: bounded real observation', () => {
  it('shows exactly the generated suffix, with a fixed buffer size', () => {
    const config = testConfig({ target: 'A'.repeat(30) })
    const engine = runEngine(config, 10_000, 10_000)
    const random = new SeededRandom(config.seed)
    const actual = Array.from({ length: 10_000 }, () => 'AB'[random.index(2)]).join('')
    expect(engine.recentText()).toBe(actual.slice(-MONITOR_LIMIT))
    expect(engine.recentText()).toHaveLength(MONITOR_LIMIT)
  })
  it('produces identical results with observation on/off and different batch sizes', () => {
    const a = runEngine(testConfig({ mode: 'continuous', monitor: true }), 1, 5000)
    const b = runEngine(testConfig({ mode: 'continuous', monitor: false }), 600, 5000)
    expect(a.totalCharacters).toBe(b.totalCharacters)
    expect(a.statistics.snapshot()).toEqual(b.statistics.snapshot())
    expect(a.history).toEqual(b.history)
    expect(b.snapshot('running', 0, 0, false).recentText).toBe('')
  })
})

describe('Phase 3: exact expectations and prefix records', () => {
  it.each([['AB', 4n], ['AA', 6n], ['AAA', 14n], ['ABA', 10n], ['ABAB', 20n]])('computes overlap-aware waiting time for %s', (target, expected) => {
    expect(expectedWaitingTime(target, 2)).toBe(expected)
  })
  it('calculates very large expectations and counters without precision loss', () => {
    const huge = expectedWaitingTime('A'.repeat(256), 95)
    expect(huge).toBeGreaterThan(10n ** 500n)
    expect(scientific(huge)).toContain('10^')
    expect(exactNumber(9007199254740993n)).toBe('9,007,199,254,740,993')
    const engine = new SimulationEngine(testConfig({ target: 'B'.repeat(30) }), () => 0)
    engine.totalCharacters = 9007199254740993n
    engine.experimentCharacters = 9007199254740993n
    engine.processBatch(10)
    expect(engine.totalCharacters).toBe(9007199254741003n)
    expect(engine.snapshot('paused', 0, 0, true).totalCharacters).toBe('9007199254741003')
  })
  it('records real first prefix achievements and only the target prefix', () => {
    const config = testConfig({ target: 'ABAB' })
    const engine = runEngine(config, 10_000)
    const random = new SeededRandom(config.seed)
    let stream = ''
    for (let i = 0; i < Number(engine.totalCharacters); i++) stream += config.alphabet[random.index(2)]
    for (const record of engine.history) {
      expect(record.text).toBe(config.target.slice(0, record.length))
      expect(BigInt(record.totalCharacters)).toBe(BigInt(stream.indexOf(record.text) + record.length))
    }
    expect(engine.history.map(r => r.length)).toEqual([1, 2, 3, 4])
  })
})

describe('Phase 4: independent experiments and bounded aggregates', () => {
  it('never carries a match across the experiment boundary', () => {
    const config = testConfig({ target: 'AA', mode: 'continuous' })
    const engine = runEngine(config, 1000, 1000)
    const random = new SeededRandom(config.seed)
    let stream = ''
    for (let i = 0; i < 1000; i++) stream += 'AB'[random.index(2)]
    const oracle: number[] = []
    let start = 0
    for (;;) {
      const found = stream.indexOf('AA', start)
      if (found < 0) break
      oracle.push(found + 2 - start)
      start = found + 2
    }
    const stats = engine.statistics.snapshot()
    expect(stats.samples.map(s => Number(s.characters))).toEqual(oracle)
    expect(engine.experimentCharacters).toBe(BigInt(1000 - start))
    expect(stats.count).toBe(oracle.length.toString())
    expect(stats.mean).toBeCloseTo(oracle.reduce((a, b) => a + b, 0) / oracle.length)
    // With overlap incorrectly retained, repeated AAA runs produce 1-character experiments.
    expect(stats.samples.every(s => BigInt(s.characters) >= 2n)).toBe(true)
  })
  it('uses all completed results for mean/variance, retains a bounded recent window', () => {
    const stats = new OnlineStatistics(3)
    for (const n of [1, 2, 3, 4, 5]) stats.add({ experiment: `${n}`, characters: `${n}`, totalCharacters: `${n * (n + 1) / 2}` })
    const result = stats.snapshot()
    expect(result.count).toBe('5')
    expect(result.samples.map(s => s.characters)).toEqual(['3', '4', '5'])
    expect(result.windowed).toBe(true)
    expect(result.mean).toBe(3)
    expect(result.standardDeviation).toBeCloseTo(Math.sqrt(2.5))
    expect(result.median).toBe(4)
    expect(result.min).toBe('1')
    expect(result.max).toBe('5')
    expect(stats.snapshot(false).samples).toEqual([])
  })
  it('computes even medians and leaves uncomputed values empty', () => {
    const stats = new OnlineStatistics()
    expect(stats.snapshot().median).toBeNull()
    expect(stats.snapshot().mean).toBeNull()
    stats.add({ experiment: '1', characters: '2', totalCharacters: '2' })
    expect(stats.snapshot().standardDeviation).toBeNull()
    stats.add({ experiment: '2', characters: '8', totalCharacters: '10' })
    expect(stats.snapshot().median).toBe(5)
  })
  it('accounts for every retained sample in linear and log histograms', () => {
    const samples = [1, 2, 2, 100, 1000, 100000].map((n, i) => ({ experiment: `${i + 1}`, characters: `${n}`, totalCharacters: '0' }))
    for (const log of [false, true]) expect(buildHistogram(samples, log).reduce((sum, bin) => sum + bin.count, 0)).toBe(samples.length)
  })
  it('exports exact counts, seed, sample policy, and spreadsheet-safe target text', () => {
    const engine = runEngine(testConfig({ target: '=A', alphabet: '=A', mode: 'continuous' }), 100, 100)
    const csv = exportCsv(engine, 1234)
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('"seed","42"')
    expect(csv).toContain('"target","\'=A"')
    expect(csv).toContain('"total_characters","100"')
    expect(csv).toContain('"samples_are_recent_window","false"')
    expect(csv).toContain('"experiment","characters_to_match","total_characters_at_match"')
  })
})
