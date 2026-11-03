import type { MatchRecord } from '../types/simulation'
import { duration, exactNumber } from '../simulation/format'
import { Icon } from './Icon'

export function MatchHistory({ history, targetLength }: { history: MatchRecord[]; targetLength: number }) {
  return <section className="panel history-panel">
    <div className="panel-heading"><span className="section-index">04</span><h2>一致の更新履歴</h2><span className="record-count mono">{history.length.toString().padStart(2, '0')}</span></div>
    <div className="history-table" tabIndex={0} aria-label="最長一致の更新履歴">
      {history.length ? <table><thead><tr><th>一致長 / 接頭辞</th><th>初達成文字数</th><th>実行時間</th></tr></thead><tbody>
        {[...history].reverse().map(record => <tr key={record.length}><td><span className={`history-length mono ${record.length === targetLength ? 'accent' : ''}`}>{record.length}<span> 文字</span>{record.length === targetLength && <Icon name="check" size={12} />}</span><span className="history-prefix mono" title={record.text}>{record.text.replaceAll(' ', '␣')}</span></td><td className="mono" title={`実験 #${record.experiment}`}>{exactNumber(record.totalCharacters)}</td><td className="mono muted" title={`${record.elapsedMs.toFixed(1)} ms`}>{duration(record.elapsedMs)}</td></tr>)}
      </tbody></table> : <div className="history-empty"><span className="history-placeholder mono">01 → 02 → 03</span><p>偶然の一歩を、記録します。</p><span>接頭辞の最長一致を更新すると表示されます</span></div>}
    </div>
    <div className="history-note">目標の先頭から連続して一致した最長記録</div>
  </section>
}
