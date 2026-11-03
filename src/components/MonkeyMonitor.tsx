import { useMemo } from 'react'
import type { SimulationProgress } from '../types/simulation'
import { duration, exactNumber } from '../simulation/format'
import { MONITOR_LIMIT } from '../simulation/config'
import { Icon } from './Icon'

export function MonkeyMonitor({ progress, target, enabled, onToggle }: { progress: SimulationProgress; target: string; enabled: boolean; onToggle(enabled: boolean): void }) {
  const parts = useMemo(() => {
    const text = progress.recentText
    const best = target.slice(0, progress.longestMatch)
    const mask = new Uint8Array(text.length)
    if (best) {
      let index = text.indexOf(best)
      while (index >= 0) { mask.fill(1, index, index + best.length); index = text.indexOf(best, index + 1) }
    }
    // Also mark the active suffix, even when the best record isn't in this sample.
    if (progress.currentMatch) mask.fill(1, Math.max(0, text.length - progress.currentMatch))
    const result: { text: string; marked: boolean }[] = []
    for (let i = 0; i < text.length; i++) {
      const marked = mask[i] === 1
      if (result.length && result[result.length - 1].marked === marked) result[result.length - 1].text += text[i]
      else result.push({ text: text[i], marked })
    }
    return result
  }, [progress.recentText, progress.longestMatch, progress.currentMatch, target])
  return <section className="panel monitor-panel">
    <div className="panel-heading"><span className="section-index">03</span><h2>観察モニター</h2><span className="monitor-live"><span className={progress.status === 'running' && enabled ? 'green-dot' : 'gray-dot'} />{progress.status === 'running' && enabled ? 'LIVE' : 'STREAM'}</span><button type="button" className="toggle" role="switch" aria-checked={enabled} aria-label="観察表示" onClick={() => onToggle(!enabled)}><span /></button></div>
    <div className="monitor-screen">
      {enabled && parts.length ? <pre className="stream" aria-label="実際に生成された直近の文字列">{parts.map((part, i) => part.marked ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>)}<span className={progress.status === 'running' ? 'cursor running' : 'cursor'} /></pre>
        : <div className="monitor-empty"><Icon name="terminal" size={25} /><p>{enabled ? progress.totalCharacters === '0' ? 'まだ、物語は始まっていません。' : '新しい文字列を待っています。' : '観察表示はオフです。'}</p><span>{enabled ? progress.totalCharacters === '0' ? '実験を開始すると、ここに文字が流れます' : '実験の境界でストリームを初期化しました' : 'シミュレーションと統計の計算は継続します'}</span></div>}
    </div>
    <div className="monitor-caption"><span><i className="highlight-key" />一致した接頭辞 <span className="mono">{progress.currentMatch}</span> 文字</span><span>直近最大 {MONITOR_LIMIT} 文字・サンプリング表示</span></div>
    <div className="monitor-footer"><span>SEED <strong className="mono">{progress.seed ?? '—'}</strong></span><span>実行時間 <strong className="mono">{duration(progress.elapsedMs)}</strong></span><span className="experiment-number">実験 <strong className="mono">#{exactNumber(BigInt(progress.statistics.count) + (progress.status === 'complete' ? 0n : 1n))}</strong></span></div>
  </section>
}
