import type { AlphabetPreset, SimulationSettings, SimulationStatus, Speed } from '../types/simulation'
import { getAlphabet, MAX_TARGET_LENGTH, SPEEDS } from '../simulation/config'
import { Icon } from './Icon'

interface Props {
  settings: SimulationSettings
  status: SimulationStatus
  ready: boolean
  errors: string[]
  onChange(settings: SimulationSettings): void
  onStart(): void
  onPause(): void
  onResume(): void
  onReset(): void
}

export function SimulationControls({ settings, status, ready, errors, onChange, onStart, onPause, onResume, onReset }: Props) {
  const locked = status !== 'idle'
  const update = <K extends keyof SimulationSettings>(key: K, value: SimulationSettings[K]) => onChange({ ...settings, [key]: value })
  const preset = (target: string, alphabet: AlphabetPreset, customAlphabet = 'AB') => onChange({ ...settings, target, preset: alphabet, customAlphabet })
  return <aside className="control-panel panel">
    <div className="panel-heading"><span className="section-index">01</span><h2>実験設定</h2><Icon name="settings" /></div>
    <fieldset disabled={locked} className="configuration">
      <div className="label-row"><label htmlFor="target">目標文字列</label><span className="mono muted">{settings.target.length} / {MAX_TARGET_LENGTH}</span></div>
      <textarea id="target" value={settings.target} onChange={e => update('target', e.target.value)} maxLength={MAX_TARGET_LENGTH} rows={2} spellCheck={false} autoCapitalize="off" aria-describedby="target-note" />
      <p id="target-note" className="field-note">大文字・小文字と空白を区別します</p>
      <div className="preset-list" aria-label="目標のサンプル">
        <button type="button" onClick={() => preset('MONKEY', 'upper')}>MONKEY</button>
        <button type="button" onClick={() => preset('TO BE', 'upperSpace')}>TO BE</button>
        <button type="button" onClick={() => preset('ABA', 'custom')}>ABA <span>お試し</span></button>
      </div>
      <div className="field-space"><label htmlFor="alphabet">文字集合</label>
        <select id="alphabet" value={settings.preset} onChange={e => update('preset', e.target.value as AlphabetPreset)}>
          <option value="upper">英大文字　A–Z</option><option value="lower">英小文字　a–z</option>
          <option value="upperSpace">英大文字 ＋ 空白</option><option value="letters">英大文字 ＋ 小文字</option>
          <option value="alphanumeric">英数字　A–Z / a–z / 0–9</option><option value="custom">カスタム</option>
        </select>
        {settings.preset === 'custom' && <input aria-label="カスタム文字集合" className="custom-alphabet mono" value={settings.customAlphabet} onChange={e => update('customAlphabet', e.target.value)} maxLength={1000} spellCheck={false} />}
        <div className="alphabet-meta"><span className="green-dot" /><span><strong>{getAlphabet(settings).length}</strong> 種類の文字を等確率で生成</span></div>
      </div>
      <div className="field-space"><div className="label-row"><label htmlFor="seed">ランダムseed</label><span className="muted">任意</span></div>
        <input id="seed" className="mono" value={settings.seed} onChange={e => update('seed', e.target.value)} placeholder="自動生成" inputMode="numeric" spellCheck={false} maxLength={12} />
        <p className="field-note">同じseedと設定で、同じ結果を再現</p>
      </div>
      <div className="field-space"><span className="field-label" id="mode-label">実験モード</span>
        <div className="segmented" role="group" aria-labelledby="mode-label">
          <button type="button" aria-pressed={settings.mode === 'single'} onClick={() => update('mode', 'single')}>1回達成</button>
          <button type="button" aria-pressed={settings.mode === 'continuous'} onClick={() => update('mode', 'continuous')}>連続実験</button>
        </div>
        <p className="field-note">{settings.mode === 'single' ? '目標が現れたら、実験を停止します' : '達成ごとに独立した実験を繰り返します'}</p>
      </div>
    </fieldset>
    <div className="field-space"><span className="field-label" id="speed-label">生成速度</span>
      <div className="segmented speed-selector" role="group" aria-labelledby="speed-label">
        {(Object.keys(SPEEDS) as Speed[]).map(speed => <button type="button" key={speed} aria-pressed={settings.speed === speed} onClick={() => update('speed', speed)}>{SPEEDS[speed].label}</button>)}
      </div>
      <div className="speed-caption"><span>観察する</span><span>計算を優先 <Icon name="arrow" size={12} /></span></div>
    </div>
    <details className="advanced"><summary>詳細設定 <span>＋</span></summary>
      <fieldset disabled={locked}>
        <label htmlFor="batch">バッチ文字数の上限</label><input id="batch" type="number" min="1" max="1000000" value={settings.batchSize} onChange={e => update('batchSize', Number(e.target.value))} />
        <label htmlFor="interval">通知間隔（ms）</label><input id="interval" type="number" min="100" max="1000" step="50" value={settings.reportInterval} onChange={e => update('reportInterval', Number(e.target.value))} />
        <p className="field-note">実際のバッチ・間隔は速度設定に応じて調整されます。</p>
      </fieldset>
    </details>
    {errors.length > 0 && <div className="validation" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
    <div className="control-actions">
      {status === 'idle' ? <button className="primary-button" disabled={!ready || errors.length > 0} onClick={onStart}><Icon name="play" size={17} />実験を開始<Icon name="arrow" size={17} /></button>
        : status === 'running' ? <button className="primary-button" onClick={onPause}><Icon name="pause" size={17} />一時停止</button>
          : status === 'paused' ? <button className="primary-button" onClick={onResume}><Icon name="play" size={17} />実験を再開<Icon name="arrow" size={17} /></button>
            : <div className={`finished-label ${status === 'complete' ? 'success' : ''}`}><Icon name={status === 'complete' ? 'check' : 'reset'} />{status === 'complete' ? '目標文字列に到達しました' : '実験をリセットしてください'}</div>}
      <button className="reset-button" disabled={status === 'idle'} onClick={onReset}><Icon name="reset" size={15} />リセット</button>
    </div>
    {locked && <p className="lock-note">目標・文字集合・seedの変更はリセット後に行えます。</p>}
    <div className="control-footnote"><span className="green-dot" />すべての計算は、このブラウザの中で。</div>
  </aside>
}
