export type Speed = 'slow' | 'standard' | 'fast' | 'maximum'
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'complete' | 'error'
export type ExperimentMode = 'single' | 'continuous'
export type AlphabetPreset = 'upper' | 'lower' | 'upperSpace' | 'letters' | 'alphanumeric' | 'custom'

export interface SimulationSettings {
  target: string
  preset: AlphabetPreset
  customAlphabet: string
  seed: string
  mode: ExperimentMode
  speed: Speed
  monitor: boolean
  batchSize: number
  reportInterval: number
}

export interface SimulationConfig {
  target: string
  alphabet: string
  seed: number
  mode: ExperimentMode
  speed: Speed
  monitor: boolean
  batchSize: number
  reportInterval: number
}

// Counters are decimal strings across the Worker boundary; never rounded JS numbers.
export interface MatchRecord {
  length: number
  totalCharacters: string
  experiment: string
  elapsedMs: number
  text: string
}

export interface ExperimentResult {
  experiment: string
  characters: string
  totalCharacters: string
}

export interface ConvergencePoint {
  experiments: string
  mean: number
}

export interface SampleStatistics {
  count: string
  min: string | null
  max: string | null
  mean: number | null
  standardDeviation: number | null
  median: number | null
  samples: ExperimentResult[]
  sampleLimit: number
  sampleCount: number
  windowed: boolean
  histogramLinear: { label: string; count: number }[]
  histogramLog: { label: string; count: number }[]
  convergence: ConvergencePoint[]
}

export interface SimulationProgress {
  status: SimulationStatus
  totalCharacters: string
  experimentCharacters: string
  currentMatch: number
  longestMatch: number
  elapsedMs: number
  charactersPerSecond: number
  recentText: string
  history: MatchRecord[]
  statistics: SampleStatistics
  seed: number | null
}

export type WorkerCommand =
  | { type: 'START'; config: SimulationConfig }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'SET_DISPLAY'; monitor: boolean }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'EXPORT' }

export type WorkerEvent =
  | { type: 'PROGRESS'; data: SimulationProgress }
  | { type: 'MATCH_UPDATE'; data: MatchRecord }
  | { type: 'COMPLETE'; data: ExperimentResult }
  | { type: 'EXPORT'; csv: string }
  | { type: 'ERROR'; message: string }
