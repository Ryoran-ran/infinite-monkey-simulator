import type { SimulationProgress } from '../types/simulation'
import { scientific, waitingTime } from '../simulation/format'
import { positionDenominator } from '../simulation/theoretical'

export function TheoryPanel({ expected, targetLength, alphabetSize, progress }: { expected: bigint; targetLength: number; alphabetSize: number; progress: SimulationProgress }) {
  const denominator = positionDenominator(targetLength, alphabetSize)
  const tooLong = progress.charactersPerSecond > 0 ? Number(expected) / progress.charactersPerSecond > 31557600 : expected > 1_000_000_000_000n
  return <section className="panel theory-panel">
    <div className="theory-eyebrow"><span className="tiny-star">✳</span> THEORETICAL EXPECTATION</div>
    <h2>偶然を、数式で見つめる。</h2>
    <span className="theory-label">初めて現れるまでの期待文字数</span>
    <div className="theory-value mono" title={expected.toString()}>{expected ? scientific(expected) : '—'}<span>文字</span></div>
    <div className="theory-formula mono">E[T] = Σ Nᵏ <span>自己重複を考慮</span></div>
    <dl className="theory-details"><div><dt>文字種数 / 目標の長さ</dt><dd className="mono">{alphabetSize} / {targetLength}</dd></div><div><dt>特定位置で現れる確率</dt><dd className="mono" title={denominator ? `1 / ${denominator}` : ''}>{denominator ? `1 / ${scientific(denominator)}` : '—'}</dd></div><div><dt>実測速度での期待待ち時間</dt><dd>{waitingTime(expected, progress.charactersPerSecond)}</dd></div></dl>
    {tooLong && <p className="theory-long">この目標の達成には、非常に長い時間がかかる可能性があります。</p>}
    <p className="theory-note">期待値は達成を保証する期限ではありません。有限回の観測と、無限回の極限を区別して考えましょう。</p>
  </section>
}
