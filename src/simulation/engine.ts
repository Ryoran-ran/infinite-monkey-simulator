import type { ExperimentResult, MatchRecord, SimulationConfig, SimulationProgress, SimulationStatus } from '../types/simulation'
import { MONITOR_LIMIT, uniqueAlphabet, validateConfig } from './config'
import { StreamMatcher } from './matcher'
import { SeededRandom } from './random'
import { OnlineStatistics } from './statistics'

export class SimulationEngine {
  readonly config: SimulationConfig
  readonly matcher: StreamMatcher
  readonly statistics = new OnlineStatistics()
  readonly history: MatchRecord[] = []
  totalCharacters = 0n
  experimentCharacters = 0n
  longestMatch = 0
  complete = false
  lastResult: ExperimentResult | null = null
  private random: SeededRandom
  private recent = new Uint8Array(MONITOR_LIMIT)
  private recentCursor = 0
  private recentLength = 0

  constructor(config: SimulationConfig, private readonly now: () => number = () => performance.now()) {
    const errors = validateConfig(config)
    if (errors.length) throw new Error(errors.join(' '))
    this.config = { ...config, alphabet: uniqueAlphabet(config.alphabet) }
    this.matcher = new StreamMatcher(config.target)
    this.random = new SeededRandom(config.seed)
  }

  processBatch(limit: number, elapsedMs = 0, timeBudgetMs = 12): number {
    if (this.complete) return 0
    const started = this.now()
    let processed = 0
    let experimentDelta = 0
    for (; processed < limit;) {
      const character = this.config.alphabet[this.random.index(this.config.alphabet.length)]
      this.recent[this.recentCursor] = character.charCodeAt(0)
      this.recentCursor = (this.recentCursor + 1) % MONITOR_LIMIT
      this.recentLength = Math.min(MONITOR_LIMIT, this.recentLength + 1)
      const matched = this.matcher.push(character)
      processed++
      experimentDelta++
      if (matched > this.longestMatch) {
        this.longestMatch = matched
        this.history.push({
          length: matched, totalCharacters: (this.totalCharacters + BigInt(processed)).toString(),
          experiment: (this.statistics.count + 1n).toString(), elapsedMs: elapsedMs + this.now() - started,
          text: this.config.target.slice(0, matched),
        })
      }
      if (matched === this.config.target.length) {
        this.experimentCharacters += BigInt(experimentDelta)
        experimentDelta = 0
        this.lastResult = {
          experiment: (this.statistics.count + 1n).toString(), characters: this.experimentCharacters.toString(),
          totalCharacters: (this.totalCharacters + BigInt(processed)).toString(),
        }
        this.statistics.add(this.lastResult)
        if (this.config.mode === 'single') { this.complete = true; break }
        // Each experiment starts with an empty matcher and display stream.
        this.experimentCharacters = 0n
        this.matcher.reset()
        this.recentCursor = 0
        this.recentLength = 0
      }
      if ((processed & 1023) === 0 && this.now() - started >= timeBudgetMs) break
    }
    this.totalCharacters += BigInt(processed)
    this.experimentCharacters += BigInt(experimentDelta)
    return processed
  }

  recentText(): string {
    let text = ''
    const start = (this.recentCursor - this.recentLength + MONITOR_LIMIT) % MONITOR_LIMIT
    for (let i = 0; i < this.recentLength; i++) text += String.fromCharCode(this.recent[(start + i) % MONITOR_LIMIT])
    return text
  }

  snapshot(status: SimulationStatus, elapsedMs: number, rate: number, monitor: boolean): SimulationProgress {
    return {
      status, totalCharacters: this.totalCharacters.toString(), experimentCharacters: this.experimentCharacters.toString(),
      currentMatch: this.matcher.matched, longestMatch: this.longestMatch, elapsedMs, charactersPerSecond: rate,
      recentText: monitor ? this.recentText() : '', history: this.history.slice(),
      statistics: this.statistics.snapshot(false), seed: this.config.seed,
    }
  }
}

export function emptyProgress(): SimulationProgress {
  return {
    status: 'idle', totalCharacters: '0', experimentCharacters: '0', currentMatch: 0, longestMatch: 0,
    elapsedMs: 0, charactersPerSecond: 0, recentText: '', history: [], seed: null,
    statistics: new OnlineStatistics().snapshot(false),
  }
}
