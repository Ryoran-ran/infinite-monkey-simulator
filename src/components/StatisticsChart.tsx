import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ExperimentMode, SimulationProgress } from '../types/simulation'
import { compactNumber, exactNumber } from '../simulation/format'
import { ConvergenceChart, ConvergenceNote, ConvergenceSummary } from './ConvergenceChart'

export function StatisticsChart({ progress, targetLength, expected, mode }: { progress: SimulationProgress; targetLength: number; expected: bigint; mode: ExperimentMode }) {
  const [view, setView] = useState<'progress' | 'distribution' | 'convergence'>(mode === 'continuous' ? 'convergence' : 'progress')
  const [log, setLog] = useState(false)
  const chart = useMemo(() => {
    const points = [{ characters: log ? 1 : 0, length: 0, exact: '0' },
      ...progress.history.map(record => ({ characters: Number(record.totalCharacters), length: record.length, exact: record.totalCharacters }))]
    if (progress.totalCharacters !== '0') points.push({ characters: Number(progress.totalCharacters), length: progress.longestMatch, exact: progress.totalCharacters })
    return points
  }, [progress.history, progress.totalCharacters, progress.longestMatch, log])
  const histogram = log ? progress.statistics.histogramLog : progress.statistics.histogramLinear
  return <section className="panel chart-panel">
    <div className="panel-heading"><span className="section-index">02</span><h2>{view === 'progress' ? '最長一致の推移' : view === 'convergence' ? '期待値への収束' : '達成文字数の分布'}</h2><div className="chart-tabs" role="group" aria-label="グラフの種類"><button type="button" aria-pressed={view === 'progress'} onClick={() => setView('progress')}>推移</button><button type="button" aria-pressed={view === 'distribution'} onClick={() => setView('distribution')}>分布</button><button type="button" aria-pressed={view === 'convergence'} onClick={() => setView('convergence')}>収束</button></div></div>
    <div className="chart-toolbar"><span>{view === 'progress' ? '先頭からの連続一致文字数' : view === 'convergence' ? `完了実験 ${exactNumber(progress.statistics.count)} 回 / 全実験の累積平均` : `完了実験の達成文字数 / ${progress.statistics.windowed ? '直近' : '全'}${progress.statistics.sampleCount.toLocaleString()}件`}</span><div className="scale-switch" role="group" aria-label="横軸の目盛り"><button type="button" aria-pressed={!log} onClick={() => setLog(false)}>通常</button><button type="button" aria-pressed={log} onClick={() => setLog(true)}>{view === 'distribution' ? '対数ビン' : '対数'}</button></div></div>
    {view === 'convergence' && <ConvergenceSummary statistics={progress.statistics} expected={expected} />}
    <div className="chart-container" role="img" aria-label={view === 'progress' ? `総生成文字数${exactNumber(progress.totalCharacters)}文字、最長一致${progress.longestMatch}文字。詳細は更新履歴に表示。` : view === 'convergence' ? `完了実験${exactNumber(progress.statistics.count)}回、累積平均${progress.statistics.mean ?? '未計算'}文字、理論期待値${expected}文字。` : `完了実験${progress.statistics.sampleCount}件の分布。`}>
      {view === 'convergence' ? <ConvergenceChart statistics={progress.statistics} expected={expected} log={log} /> : view === 'progress' ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={chart} margin={{ top: 15, right: 20, bottom: 5, left: -20 }}>
        <defs><linearGradient id="match-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bfe58b" stopOpacity={0.17} /><stop offset="100%" stopColor="#bfe58b" stopOpacity={0.01} /></linearGradient></defs>
        <CartesianGrid stroke="#2b312c" strokeDasharray="3 6" vertical={false} />
        <XAxis type="number" dataKey="characters" scale={log ? 'log' : 'auto'} domain={log ? [1, Math.max(10, Number(progress.totalCharacters))] : [0, Math.max(10, Number(progress.totalCharacters))]} tickFormatter={compactNumber} stroke="#747d72" tickLine={false} axisLine={false} minTickGap={35} tick={{ fontSize: 10 }} />
        <YAxis domain={[0, Math.max(1, targetLength)]} allowDecimals={false} stroke="#747d72" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#202620', border: '1px solid #46513e', borderRadius: 8, fontSize: 12 }} labelFormatter={(_, payload) => `${payload?.[0]?.payload?.exact ? exactNumber(payload[0].payload.exact) : '0'} 文字生成`} formatter={value => [`${value} 文字`, '最長一致']} />
        <ReferenceLine y={targetLength} stroke="#566745" strokeDasharray="4 5" />
        <Area type="stepAfter" dataKey="length" stroke="#c1e78d" strokeWidth={2} fill="url(#match-fill)" isAnimationActive={false} dot={false} activeDot={{ r: 4, stroke: '#131713', strokeWidth: 2 }} />
      </AreaChart></ResponsiveContainer> : histogram.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={histogram} margin={{ top: 15, right: 20, bottom: 5, left: -20 }}>
        <CartesianGrid stroke="#2b312c" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#747d72" tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={label => String(label).split('–')[0]} /><YAxis allowDecimals={false} stroke="#747d72" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: '#202620', border: '1px solid #46513e', borderRadius: 8, fontSize: 12 }} formatter={value => [`${value} 回`, '実験数']} labelFormatter={label => `${label} 文字`} /><Bar dataKey="count" fill="#a8c981" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={44} />
      </BarChart></ResponsiveContainer> : <div className="distribution-empty"><span className="empty-bars"><i /><i /><i /><i /><i /></span><p>達成のばらつきを、見つけよう。</p><span>連続実験で、完了した実験の分布を観察できます</span></div>}
    </div>
    <div className="chart-footer"><span><i className="chart-legend" />{view === 'progress' ? '最長一致' : view === 'convergence' ? '累積平均' : '実験数'}{view === 'convergence' && <><i className="theory-legend" />理論期待値</>}</span><span>{view === 'progress' ? '総生成文字数 →' : view === 'convergence' ? '完了した実験回数 →' : `達成までの文字数 →${progress.statistics.windowed ? '（直近標本）' : ''}`}</span></div>
    {view === 'convergence' && <ConvergenceNote />}
  </section>
}
