import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SampleStatistics } from '../types/simulation'
import { CONVERGENCE_POINT_LIMIT } from '../simulation/config'
import { convergenceData, formatRelativeError, relativeErrorPercent } from '../simulation/convergence'
import { compactNumber, exactNumber, scientific, statistic } from '../simulation/format'

export function ConvergenceSummary({ statistics, expected }: { statistics: SampleStatistics; expected: bigint }) {
  return <dl className="convergence-summary">
    <div><dt>累積平均 <span>文字</span></dt><dd className="mono accent">{statistic(statistics.mean)}</dd></div>
    <div><dt>理論期待値 <span>文字</span></dt><dd className="mono">{expected ? scientific(expected) : '—'}</dd></div>
    <div><dt>理論値との相対誤差</dt><dd className="mono">{formatRelativeError(relativeErrorPercent(statistics.mean, expected))}</dd></div>
  </dl>
}

export function ConvergenceChart({ statistics, expected, log }: { statistics: SampleStatistics; expected: bigint; log: boolean }) {
  const data = convergenceData(statistics)
  const theory = Number(expected)
  const chartable = Number.isFinite(theory) && theory > 0
  if (!data.length || !chartable) return <div className="distribution-empty"><span className="convergence-placeholder mono">x̄ → E[T]</span><p>{chartable ? '平均が、期待値へ近づくまで。' : expected > 0n ? '理論値がグラフの数値範囲を超えています。' : '有効な目標文字列を設定してください。'}</p><span>「ABA お試し」＋連続実験で、収束の様子を観察できます</span></div>
  const maximumMean = Math.max(theory, ...data.map(point => point.mean))
  return <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={data} margin={{ top: 15, right: 20, bottom: 5, left: -8 }}>
    <CartesianGrid stroke="#2b312c" strokeDasharray="3 6" vertical={false} />
    <XAxis type="number" dataKey="count" scale={log ? 'log' : 'auto'} domain={log ? [1, Math.max(10, Number(statistics.count))] : [0, Math.max(10, Number(statistics.count))]} tickFormatter={compactNumber} stroke="#747d72" tickLine={false} axisLine={false} minTickGap={35} tick={{ fontSize: 10 }} />
    <YAxis type="number" domain={[0, Math.max(1, maximumMean * 1.08)]} tickFormatter={compactNumber} stroke="#747d72" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
    <Tooltip contentStyle={{ background: '#202620', border: '1px solid #46513e', borderRadius: 8, fontSize: 12 }}
      labelFormatter={(_, payload) => `${payload?.[0]?.payload?.experiments ? exactNumber(payload[0].payload.experiments) : '0'} 回完了時点`}
      formatter={value => [`${statistic(Number(value))} 文字（${formatRelativeError(relativeErrorPercent(Number(value), expected))}）`, '累積平均']} />
    <ReferenceLine y={theory} stroke="#d1b981" strokeWidth={1.5} strokeDasharray="5 5" />
    <Line type="linear" dataKey="mean" name="累積平均" stroke="#c1e78d" strokeWidth={2} isAnimationActive={false} dot={data.length === 1 ? { r: 3, fill: '#c1e78d' } : false} activeDot={{ r: 4, stroke: '#131713', strokeWidth: 2 }} />
  </LineChart></ResponsiveContainer>
}

export function ConvergenceNote() {
  return <p className="convergence-note">全完了実験の累積平均です。途中の実験は含みません。上下に揺れながら近づく過程を観察します。推移は最大{CONVERGENCE_POINT_LIMIT}点に間引き、最初と最新の平均を保持します。</p>
}
