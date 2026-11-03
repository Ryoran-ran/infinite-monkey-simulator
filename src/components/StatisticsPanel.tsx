import type { SimulationProgress } from '../types/simulation'
import { compactNumber, exactNumber, statistic } from '../simulation/format'

export function StatisticsPanel({ progress, targetLength }: { progress: SimulationProgress; targetLength: number }) {
  const percent = targetLength ? progress.longestMatch / targetLength * 100 : 0
  return <section className="metrics" aria-label="リアルタイム統計">
    <div className="metric metric-total"><div className="metric-label">総生成文字数 <span className="metric-code">TOTAL</span></div><div className="metric-value mono" title={exactNumber(progress.totalCharacters)}>{exactNumber(progress.totalCharacters)}</div><div className="metric-sub">現在の実験 <span className="mono">{exactNumber(progress.experimentCharacters)}</span> 文字</div></div>
    <div className="metric"><div className="metric-label">最長一致 <span className="metric-code">BEST</span></div><div className="metric-value mono accent">{progress.longestMatch}<span className="metric-unit"> / {targetLength}</span></div><div className="match-meter" role="meter" aria-label="最長一致率" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><div className="metric-sub">目標の {percent.toFixed(1)}%</div></div>
    <div className="metric"><div className="metric-label">処理速度 <span className="metric-code">SPEED</span></div><div className="metric-value mono">{progress.status === 'idle' || progress.status === 'paused' ? '—' : compactNumber(progress.charactersPerSecond)}</div><div className="metric-sub">文字 / 秒<span className="live-tiny">{progress.status === 'running' ? '計測中' : '実測値'}</span></div></div>
    <div className="metric"><div className="metric-label">完全一致 <span className="metric-code">MATCHES</span></div><div className="metric-value mono">{exactNumber(progress.statistics.count)}<span className="metric-unit"> 回</span></div><div className="metric-sub">完了した独立実験数</div></div>
  </section>
}

export function ExperimentStatistics({ progress, expected }: { progress: SimulationProgress; expected: bigint }) {
  const stats = progress.statistics
  const ratio = stats.mean !== null && expected > 0n ? stats.mean / Number(expected) : null
  const difference = stats.mean !== null && expected > 0n ? stats.mean - Number(expected) : null
  return <section className="panel aggregate-panel">
    <div className="panel-heading"><span className="section-index">05</span><h2>反復実験の統計</h2><span className="heading-aside">成功した実験のみ集計</span></div>
    <dl className="aggregate-grid">
      <div><dt>平均達成文字数</dt><dd className="mono">{statistic(stats.mean)}</dd></div>
      <div><dt>中央値{stats.windowed ? '（直近）' : ''}</dt><dd className="mono">{statistic(stats.median)}</dd></div>
      <div><dt>標準偏差 <span className="muted">標本</span></dt><dd className="mono">{statistic(stats.standardDeviation)}</dd></div>
      <div><dt>最小 / 最大</dt><dd className="mono small-number" title={stats.min ? `${exactNumber(stats.min)} / ${exactNumber(stats.max!)}` : ''}>{stats.min ? `${compactNumber(Number(stats.min))} / ${compactNumber(Number(stats.max))}` : '—'}</dd></div>
      <div><dt>平均 / 理論値</dt><dd className="mono">{ratio === null ? '—' : `${ratio.toLocaleString('ja-JP', { maximumFractionDigits: 3 })} ×`}</dd></div>
      <div><dt>平均 − 理論値</dt><dd className="mono small-number">{difference === null ? '—' : `${difference > 0 ? '+' : ''}${statistic(difference)}`}</dd></div>
    </dl>
    <p className="aggregate-note">平均・標本標準偏差は全完了実験をオンライン集計。中央値・分布・CSV明細は直近最大{stats.sampleLimit.toLocaleString()}件{stats.windowed ? `（全${exactNumber(stats.count)}件中の${stats.sampleCount.toLocaleString()}件）` : `（現在${stats.sampleCount.toLocaleString()}件）`}。途中の実験は含みません。</p>
  </section>
}
