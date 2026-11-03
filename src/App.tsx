import { useEffect, useMemo, useState } from 'react'
import { SimulationControls } from './components/SimulationControls'
import { ExperimentStatistics, StatisticsPanel } from './components/StatisticsPanel'
import { StatisticsChart } from './components/StatisticsChart'
import { TheoryPanel } from './components/TheoryPanel'
import { MonkeyMonitor } from './components/MonkeyMonitor'
import { MatchHistory } from './components/MatchHistory'
import { Icon } from './components/Icon'
import { useSimulation } from './hooks/useSimulation'
import { getAlphabet, loadSettings, makeConfig, saveSettings, validateConfig } from './simulation/config'
import { expectedWaitingTime } from './simulation/theoretical'
import type { SimulationSettings, SimulationStatus } from './types/simulation'

const STATUS_LABELS: Record<SimulationStatus, string> = { idle: '実験の準備ができました', running: '実験中', paused: '一時停止中', complete: '完全一致を達成', error: 'エラー' }

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const simulation = useSimulation()
  const { progress } = simulation
  const alphabet = getAlphabet(settings)
  const config = useMemo(() => makeConfig(settings, 0), [settings])
  const errors = useMemo(() => validateConfig(config), [config])
  const expected = useMemo(() => errors.length ? 0n : expectedWaitingTime(settings.target, alphabet.length), [settings.target, alphabet.length, errors.length])
  useEffect(() => saveSettings(settings), [settings])
  const changeSettings = (next: SimulationSettings) => {
    if (next.monitor !== settings.monitor) simulation.setMonitor(next.monitor)
    if (next.speed !== settings.speed) simulation.setSpeed(next.speed)
    setSettings(next)
  }
  const start = () => {
    if (errors.length) return
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    simulation.start(makeConfig(settings, seed))
  }

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand"><span className="brand-mark"><Icon name="infinity" size={29} /></span><div><span className="brand-name">Infinite Monkey<span className="brand-secondary"> Simulator</span></span><span className="brand-caption">THE INFINITE POSSIBILITY LAB</span></div><span className="version-tag mono">v1.0</span></div>
      <div className="header-note"><span className="green-dot" />ブラウザで動く、小さな実験室</div>
    </header>
    <main>
      <div className="intro-row"><div><div className="eyebrow">EXPERIMENT NO. 001 <span> / </span> 無限の猿定理</div><h1>偶然が、<span>意味になるまで。</span></h1><p>ランダムな文字の海に、あなたの言葉が現れる確率を観察する。</p></div><div className={`status-badge ${progress.status}`} role="status"><span className={progress.status === 'running' || progress.status === 'complete' ? 'green-dot' : 'gray-dot'} />{STATUS_LABELS[progress.status]}</div></div>
      <div className="workspace">
        <SimulationControls settings={settings} status={progress.status} ready={simulation.ready} errors={errors} onChange={changeSettings} onStart={start} onPause={simulation.pause} onResume={simulation.resume} onReset={simulation.reset} />
        <div className="results-workspace">
          {simulation.error && <div className="error-banner" role="alert">{simulation.error}</div>}
          <StatisticsPanel progress={progress} targetLength={settings.target.length} />
          <div className="analysis-row"><StatisticsChart key={settings.mode} progress={progress} targetLength={settings.target.length} expected={expected} mode={settings.mode} /><TheoryPanel expected={expected} targetLength={settings.target.length} alphabetSize={alphabet.length} progress={progress} /></div>
          <div className="observation-row"><MonkeyMonitor progress={progress} target={settings.target} enabled={settings.monitor} onToggle={monitor => changeSettings({ ...settings, monitor })} /><MatchHistory history={progress.history} targetLength={settings.target.length} /></div>
          <ExperimentStatistics progress={progress} expected={expected} />
          <div className="results-footer"><p><span className="green-dot" />計算と描画を分離したWeb Workerで実行 <span className="footer-divider">/</span> 設定のみ自動保存</p><button type="button" className="export-button" disabled={progress.totalCharacters === '0' || simulation.exporting} onClick={simulation.exportResults}><Icon name="download" size={15} />{simulation.exporting ? 'CSVを作成中…' : '結果をCSVで保存'}</button></div>
        </div>
      </div>
    </main>
    <footer className="site-footer"><span>INFINITE MONKEY SIMULATOR</span><p>無限の可能性を、有限の実験で。</p><span className="mono">RANDOMNESS → MEANING</span></footer>
  </div>
}
