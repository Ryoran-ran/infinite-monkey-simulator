import { describe, expect, it } from 'vitest'
import { SimulationRuntime } from './runtime'
import type { Scheduler } from './runtime'
import type { SimulationConfig, SimulationProgress, WorkerEvent } from '../types/simulation'

const config: SimulationConfig = {
  target: 'A'.repeat(30), alphabet: 'AB', seed: 42, mode: 'single', speed: 'slow',
  monitor: true, batchSize: 10000, reportInterval: 150,
}
class TestScheduler implements Scheduler {
  time = 0
  id = 0
  tasks = new Map<number, { fn: () => void; delay: number }>()
  now = () => this.time
  schedule = (fn: () => void, delay: number) => { this.tasks.set(++this.id, { fn, delay }); return this.id }
  cancel = (handle: unknown) => { this.tasks.delete(handle as number) }
  run(count = 1) {
    for (let n = 0; n < count; n++) {
      const [id, task] = [...this.tasks.entries()][0] ?? []
      if (!task) break
      this.tasks.delete(id)
      this.time += Math.max(1, task.delay)
      task.fn()
    }
  }
}
function setup() {
  const clock = new TestScheduler()
  const events: WorkerEvent[] = []
  const runtime = new SimulationRuntime(event => events.push(event), clock)
  const latest = () => events.filter((e): e is Extract<WorkerEvent, { type: 'PROGRESS' }> => e.type === 'PROGRESS').at(-1)!.data
  return { clock, events, runtime, latest }
}

describe('Worker lifecycle and integration', () => {
  it('starts, pauses without advancing, resumes excluding paused time, and resets', () => {
    const { clock, runtime, latest } = setup()
    runtime.handle({ type: 'START', config })
    clock.run(10)
    runtime.handle({ type: 'PAUSE' })
    const paused = latest()
    expect(paused.status).toBe('paused')
    expect(BigInt(paused.totalCharacters)).toBeGreaterThan(0n)
    expect(clock.tasks.size).toBe(0)
    clock.time += 60_000
    clock.run(10)
    runtime.handle({ type: 'RESUME' })
    expect(latest().elapsedMs).toBe(paused.elapsedMs)
    clock.run(10)
    runtime.handle({ type: 'PAUSE' })
    expect(latest().elapsedMs).toBeLessThan(2000)
    expect(BigInt(latest().totalCharacters)).toBeGreaterThan(BigInt(paused.totalCharacters))
    runtime.handle({ type: 'RESET' })
    expect(latest().status).toBe('idle')
    expect(latest().totalCharacters).toBe('0')
    expect(latest().statistics.count).toBe('0')
    expect(latest().history).toEqual([])
    expect(clock.tasks.size).toBe(0)
  })
  it('completes precisely once and schedules no further work', () => {
    const { clock, runtime, latest, events } = setup()
    runtime.handle({ type: 'START', config: { ...config, target: 'AB', speed: 'maximum' } })
    clock.run(10)
    expect(latest().status).toBe('complete')
    expect(latest().statistics.count).toBe('1')
    expect(events.filter(e => e.type === 'COMPLETE')).toHaveLength(1)
    expect(clock.tasks.size).toBe(0)
  })
  it('handles live speed/display changes without changing the sequence', () => {
    const first = setup()
    first.runtime.handle({ type: 'START', config })
    first.clock.run(10)
    first.runtime.handle({ type: 'SET_DISPLAY', monitor: false })
    first.runtime.handle({ type: 'SET_SPEED', speed: 'fast' })
    first.clock.run(2)
    first.runtime.handle({ type: 'PAUSE' })
    expect(first.latest().recentText).toBe('')
    first.runtime.handle({ type: 'SET_DISPLAY', monitor: true })
    const visible = first.latest()
    expect(visible.recentText.length).toBeGreaterThan(0)
    const second = setup()
    second.runtime.handle({ type: 'START', config: { ...config, batchSize: 1 } })
    second.clock.run(Number(visible.totalCharacters))
    second.runtime.handle({ type: 'PAUSE' })
    expect(second.latest().recentText).toBe(visible.recentText)
    expect(second.latest().longestMatch).toBe(visible.longestMatch)
  })
  it('throttles regular notifications, even in maximum speed', () => {
    const { runtime, clock, events } = setup()
    runtime.handle({ type: 'START', config: { ...config, speed: 'maximum', batchSize: 1 } })
    clock.run(1000)
    const progress = events.filter(e => e.type === 'PROGRESS')
    // Initial state plus one report each 250ms, not a message for each batch/character.
    expect(progress.length).toBe(5)
  })
  it('rejects invalid input in the worker and clears pending work', () => {
    const { runtime, clock, events } = setup()
    runtime.handle({ type: 'START', config: { ...config, seed: -1 } })
    expect(events.at(-1)?.type).toBe('ERROR')
    expect(clock.tasks.size).toBe(0)
    runtime.handle({ type: 'RESET' })
    runtime.handle({ type: 'START', config })
    clock.run(4)
    runtime.handle({ type: 'START', config: { ...config, seed: 5 } })
    expect(events.at(-1)?.type).toBe('ERROR')
    expect(clock.tasks.size).toBe(0)
  })
  it('does not count the unfinished experiment as a success', () => {
    const { runtime, clock, latest } = setup()
    runtime.handle({ type: 'START', config })
    clock.run(2)
    runtime.handle({ type: 'PAUSE' })
    expect(latest().totalCharacters).toBe('8')
    expect(latest().statistics.mean).toBeNull()
    expect(latest().statistics.count).toBe('0')
  })
  it('exports a consistent snapshot while continuous execution remains active', () => {
    const { runtime, clock, latest, events } = setup()
    runtime.handle({ type: 'START', config: { ...config, target: 'AB', mode: 'continuous' } })
    clock.run(10)
    runtime.handle({ type: 'EXPORT' })
    const exported = events.at(-1)
    expect(exported?.type).toBe('EXPORT')
    if (exported?.type === 'EXPORT') expect(exported.csv).toContain('"mode","continuous"')
    expect(clock.tasks.size).toBe(1)
    runtime.handle({ type: 'PAUSE' })
    expect(latest().status).toBe('paused')
    expect(BigInt(latest().statistics.count)).toBeGreaterThan(0n)
  })
  it('resets reproduce the same exact seeded first match', () => {
    const { runtime, clock, latest } = setup()
    const cfg = { ...config, target: 'ABA', speed: 'standard' as const }
    runtime.handle({ type: 'START', config: cfg })
    clock.run(2)
    const first: SimulationProgress = latest()
    runtime.handle({ type: 'RESET' })
    runtime.handle({ type: 'START', config: cfg })
    clock.run(2)
    expect(latest().totalCharacters).toBe(first.totalCharacters)
    expect(latest().statistics).toEqual(first.statistics)
    expect(latest().recentText).toBe(first.recentText)
  })
})
