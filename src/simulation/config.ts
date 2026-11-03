import type { AlphabetPreset, SimulationConfig, SimulationSettings, Speed } from '../types/simulation'

export const MAX_TARGET_LENGTH = 256
export const MONITOR_LIMIT = 500
export const SAMPLE_LIMIT = 10_000
export const CONVERGENCE_POINT_LIMIT = 512
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const LOWER = 'abcdefghijklmnopqrstuvwxyz'
export const ALPHABETS: Record<Exclude<AlphabetPreset, 'custom'>, string> = {
  upper: UPPER,
  lower: LOWER,
  upperSpace: UPPER + ' ',
  letters: UPPER + LOWER,
  alphanumeric: UPPER + LOWER + '0123456789',
}
export const SPEEDS: Record<Speed, { label: string; batch: number; delay: number; interval: number }> = {
  slow: { label: '低速', batch: 4, delay: 50, interval: 100 },
  standard: { label: '標準', batch: 10_000, delay: 12, interval: 150 },
  fast: { label: '高速', batch: 100_000, delay: 0, interval: 200 },
  maximum: { label: '最高速', batch: 500_000, delay: 0, interval: 250 },
}
export const DEFAULT_SETTINGS: SimulationSettings = {
  target: 'MONKEY', preset: 'upper', customAlphabet: 'AB', seed: '',
  mode: 'single', speed: 'standard', monitor: true, batchSize: 100_000, reportInterval: 150,
}
export function uniqueAlphabet(value: string): string { return [...new Set(value)].join('') }
export function getAlphabet(settings: SimulationSettings): string {
  return settings.preset === 'custom' ? uniqueAlphabet(settings.customAlphabet) : ALPHABETS[settings.preset]
}
export function isSpeed(value: unknown): value is Speed {
  return typeof value === 'string' && Object.hasOwn(SPEEDS, value)
}
export function validateConfig(config: SimulationConfig): string[] {
  const errors: string[] = []
  if (!config.target.length) errors.push('目標文字列を入力してください。')
  if (config.target.length > MAX_TARGET_LENGTH) errors.push(`目標文字列は${MAX_TARGET_LENGTH}文字以内で入力してください。`)
  if (!/^[\x20-\x7e]*$/.test(config.target + config.alphabet)) errors.push('半角英数字・記号・空白（印字可能なASCII文字）を使用してください。')
  if (uniqueAlphabet(config.alphabet).length < 2) errors.push('文字集合には異なる2文字以上が必要です。')
  const missing = [...new Set([...config.target].filter(c => !config.alphabet.includes(c)))]
  if (missing.length) errors.push(`文字集合に含まれない文字があります：${missing.map(c => c === ' ' ? '␣（空白）' : c).join('、')}`)
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff) errors.push('seedは0〜4,294,967,295の整数で指定してください。')
  if (!isSpeed(config.speed)) errors.push('有効な速度を選択してください。')
  if (!['single', 'continuous'].includes(config.mode)) errors.push('有効な実験モードを選択してください。')
  if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 1_000_000) errors.push('バッチ上限は1〜1,000,000で指定してください。')
  if (!Number.isInteger(config.reportInterval) || config.reportInterval < 100 || config.reportInterval > 1000) errors.push('通知間隔は100〜1,000msで指定してください。')
  return errors
}
export function makeConfig(settings: SimulationSettings, autoSeed: number): SimulationConfig {
  return {
    target: settings.target, alphabet: getAlphabet(settings),
    seed: settings.seed === '' ? autoSeed : (/^\d+$/.test(settings.seed) ? Number(settings.seed) : NaN),
    mode: settings.mode, speed: settings.speed, monitor: settings.monitor,
    batchSize: settings.batchSize, reportInterval: settings.reportInterval,
  }
}
const STORAGE_KEY = 'infinite-monkey.settings.v1'
export function loadSettings(): SimulationSettings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_SETTINGS }
    const s = saved as Record<string, unknown>
    // Do not trust the shape or bounds of stored settings.
    return {
      target: typeof s.target === 'string' ? s.target.slice(0, MAX_TARGET_LENGTH) : DEFAULT_SETTINGS.target,
      preset: typeof s.preset === 'string' && (s.preset === 'custom' || Object.hasOwn(ALPHABETS, s.preset)) ? s.preset as AlphabetPreset : 'upper',
      customAlphabet: typeof s.customAlphabet === 'string' ? s.customAlphabet.slice(0, 1000) : 'AB',
      seed: typeof s.seed === 'string' && /^\d{0,10}$/.test(s.seed) ? s.seed : '',
      mode: s.mode === 'continuous' ? 'continuous' : 'single',
      speed: isSpeed(s.speed) ? s.speed : 'standard',
      monitor: typeof s.monitor === 'boolean' ? s.monitor : true,
      batchSize: Number.isInteger(s.batchSize) && Number(s.batchSize) >= 1 && Number(s.batchSize) <= 1_000_000 ? Number(s.batchSize) : DEFAULT_SETTINGS.batchSize,
      reportInterval: Number.isInteger(s.reportInterval) && Number(s.reportInterval) >= 100 && Number(s.reportInterval) <= 1000 ? Number(s.reportInterval) : DEFAULT_SETTINGS.reportInterval,
    }
  } catch { return { ...DEFAULT_SETTINGS } }
}
export function saveSettings(settings: SimulationSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* Storage may be unavailable. */ }
}
