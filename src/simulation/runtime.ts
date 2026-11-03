import type { SimulationStatus, WorkerCommand, WorkerEvent } from '../types/simulation'
import { isSpeed, SPEEDS } from './config'
import { emptyProgress, SimulationEngine } from './engine'
import { exportCsv } from './csv'

export interface Scheduler {
  now(): number
  schedule(callback: () => void, delay: number): unknown
  cancel(handle: unknown): void
}

// The runtime is independent of Worker globals so its actual lifecycle can be tested.
export class SimulationRuntime {
  private engine: SimulationEngine | null = null
  private status: SimulationStatus = 'idle'
  private timer: unknown = null
  private elapsed = 0
  private resumedAt = 0
  private lastReport = 0
  private rateAt = 0
  private rateCharacters = 0n
  private rate = 0
  private historySent = 0

  constructor(private send: (event: WorkerEvent) => void, private scheduler: Scheduler) {}

  handle(command: WorkerCommand): void {
    try {
      switch (command.type) {
        case 'START': {
          if (this.status !== 'idle' && this.status !== 'complete' && this.status !== 'error') throw new Error('設定を変更するにはリセットしてください。')
          const next = new SimulationEngine(command.config, () => this.scheduler.now())
          this.clear()
          this.engine = next
          this.status = 'running'
          this.elapsed = 0
          this.rate = 0
          this.historySent = 0
          this.resumedAt = this.scheduler.now()
          this.rateAt = this.resumedAt
          this.lastReport = this.resumedAt
          this.rateCharacters = 0n
          this.report()
          this.queue(0)
          break
        }
        case 'PAUSE':
          if (this.status === 'running') {
            this.elapsed = this.activeElapsed()
            this.status = 'paused'
            this.clear()
            this.rate = 0
            this.report()
          }
          break
        case 'RESUME':
          if (this.status === 'paused') {
            this.status = 'running'
            this.resumedAt = this.scheduler.now()
            this.rateAt = this.resumedAt
            this.rateCharacters = this.engine!.totalCharacters
            this.lastReport = this.resumedAt
            this.report()
            this.queue(0)
          }
          break
        case 'RESET':
          this.clear()
          this.engine = null
          this.elapsed = 0
          this.rate = 0
          this.status = 'idle'
          this.send({ type: 'PROGRESS', data: emptyProgress() })
          break
        case 'SET_DISPLAY':
          if (this.engine) { this.engine.config.monitor = !!command.monitor; this.report() }
          break
        case 'SET_SPEED':
          if (!isSpeed(command.speed)) throw new Error('有効な速度を選択してください。')
          if (this.engine) this.engine.config.speed = command.speed
          break
        case 'EXPORT':
          if (this.engine) this.send({ type: 'EXPORT', csv: exportCsv(this.engine, this.activeElapsed()) })
          break
      }
    } catch (error) { this.fail(error) }
  }

  private activeElapsed(): number {
    return this.elapsed + (this.status === 'running' ? this.scheduler.now() - this.resumedAt : 0)
  }
  private clear(): void {
    if (this.timer !== null) this.scheduler.cancel(this.timer)
    this.timer = null
  }
  private queue(delay: number): void {
    this.timer = this.scheduler.schedule(() => { this.timer = null; this.tick() }, delay)
  }
  private tick(): void {
    if (this.status !== 'running' || !this.engine) return
    try {
      const speed = SPEEDS[this.engine.config.speed]
      this.engine.processBatch(Math.min(speed.batch, this.engine.config.batchSize), this.activeElapsed())
      const now = this.scheduler.now()
      if (this.engine.complete) {
        this.elapsed = this.activeElapsed()
        this.status = 'complete'
        this.updateRate(now)
        this.report()
        if (this.engine.lastResult) this.send({ type: 'COMPLETE', data: this.engine.lastResult })
        return
      }
      const interval = Math.max(speed.interval, this.engine.config.reportInterval)
      if (now - this.lastReport >= interval) {
        this.updateRate(now)
        this.report()
      }
      this.queue(speed.delay)
    } catch (error) { this.fail(error) }
  }
  private updateRate(now: number): void {
    const dt = now - this.rateAt
    if (dt > 0 && this.engine) this.rate = Number(this.engine.totalCharacters - this.rateCharacters) / (dt / 1000)
    this.rateAt = now
    this.rateCharacters = this.engine?.totalCharacters ?? 0n
  }
  private report(): void {
    if (!this.engine) return
    for (; this.historySent < this.engine.history.length; this.historySent++) {
      this.send({ type: 'MATCH_UPDATE', data: this.engine.history[this.historySent] })
    }
    this.send({ type: 'PROGRESS', data: this.engine.snapshot(this.status, this.activeElapsed(), this.rate, this.engine.config.monitor) })
    this.lastReport = this.scheduler.now()
  }
  private fail(error: unknown): void {
    if (this.status === 'running') this.elapsed = this.activeElapsed()
    this.status = 'error'
    this.clear()
    this.send({ type: 'ERROR', message: error instanceof Error ? error.message : 'シミュレーションでエラーが発生しました。' })
  }
}
