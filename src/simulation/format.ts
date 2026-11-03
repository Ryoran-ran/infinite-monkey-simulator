export function exactNumber(value: string | bigint): string {
  return BigInt(value).toLocaleString('ja-JP')
}
export function scientific(value: bigint): string {
  const text = value.toString()
  if (text.length <= 10) return value.toLocaleString('ja-JP')
  const mantissa = Number(text.slice(0, 4)) / 1000
  return `${mantissa.toFixed(2)} × 10^${text.length - 1}`
}
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })
}
export function statistic(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  if (value >= 1e12) return value.toExponential(3)
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })
}
export function duration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
export function waitingTime(characters: bigint, rate: number): string {
  if (!(rate > 0)) return '実行すると推定します'
  const seconds = Number(characters) / rate
  if (!Number.isFinite(seconds)) return '計算可能な時間の範囲を超えています'
  if (seconds < 60) return `約 ${statistic(seconds)} 秒`
  if (seconds < 3600) return `約 ${statistic(seconds / 60)} 分`
  if (seconds < 86400) return `約 ${statistic(seconds / 3600)} 時間`
  if (seconds < 31557600) return `約 ${statistic(seconds / 86400)} 日`
  return `約 ${statistic(seconds / 31557600)} 年`
}
