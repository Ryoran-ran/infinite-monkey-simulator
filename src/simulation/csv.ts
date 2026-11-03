import type { SimulationEngine } from './engine'
import { expectedWaitingTime } from './theoretical'
import { relativeErrorPercent } from './convergence'

// Prefix arbitrary text cells with an apostrophe to avoid spreadsheet formula execution.
function cell(value: unknown, literal = false): string {
  let text = String(value ?? '')
  if (literal && /^[=+\-@\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export function exportCsv(engine: SimulationEngine, elapsedMs: number): string {
  const config = engine.config
  const stats = engine.statistics.snapshot()
  const expected = expectedWaitingTime(config.target, config.alphabet.length)
  const rows: string[] = []
  const row = (...values: unknown[]) => rows.push(values.map(v => cell(v)).join(','))
  const textRow = (key: string, value: string) => rows.push(`${cell(key)},${cell(value, true)}`)
  row('Infinite Monkey Simulator', '1.0')
  textRow('target', config.target)
  textRow('alphabet', config.alphabet)
  row('seed', config.seed)
  row('mode', config.mode)
  row('total_characters', engine.totalCharacters)
  row('current_experiment_characters', engine.experimentCharacters)
  row('active_elapsed_ms', elapsedMs)
  row('completed_experiments', stats.count)
  row('mean_all_completed', stats.mean)
  row('sample_standard_deviation_all_completed', stats.standardDeviation)
  row('min_all_completed', stats.min)
  row('max_all_completed', stats.max)
  row('median_retained_samples', stats.median)
  row('retained_samples', stats.sampleCount)
  row('sample_limit', stats.sampleLimit)
  row('samples_are_recent_window', stats.windowed)
  row('theoretical_expected_characters', expected)
  row('mean_relative_error_percent', relativeErrorPercent(stats.mean, expected))
  row('')
  row('experiment', 'characters_to_match', 'total_characters_at_match')
  for (const sample of stats.samples) row(sample.experiment, sample.characters, sample.totalCharacters)
  row('')
  row('completed_experiments', 'cumulative_mean_characters', 'theoretical_expected_characters', 'relative_error_percent')
  for (const point of stats.convergence) row(point.experiments, point.mean, expected, relativeErrorPercent(point.mean, expected))
  row('')
  row('record_prefix_length', 'total_characters', 'active_elapsed_ms', 'experiment', 'prefix')
  for (const record of engine.history) rows.push([cell(record.length), cell(record.totalCharacters), cell(record.elapsedMs), cell(record.experiment), cell(record.text, true)].join(','))
  return '\ufeff' + rows.join('\r\n') + '\r\n'
}
