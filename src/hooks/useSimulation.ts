import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimulationConfig, Speed, WorkerCommand, WorkerEvent } from '../types/simulation'
import { emptyProgress } from '../simulation/engine'

function downloadCsv(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `monkey-experiment-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useSimulation() {
  const [progress, setProgress] = useState(emptyProgress)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const exportTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let worker: Worker
    try {
      worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
        switch (event.data.type) {
          case 'PROGRESS': setProgress(event.data.data); break
          case 'ERROR':
            setError(event.data.message)
            setProgress(p => ({ ...p, status: 'error' }))
            setExporting(false)
            break
          case 'EXPORT':
            if (exportTimer.current) clearTimeout(exportTimer.current)
            setExporting(false)
            downloadCsv(event.data.csv)
            break
        }
      }
      worker.onerror = () => {
        setError('計算用Workerを起動できませんでした。ページを再読み込みしてください。')
        setProgress(p => ({ ...p, status: 'error' }))
        setExporting(false)
      }
      setReady(true)
    } catch {
      setError('この環境ではWeb Workerを利用できません。対応するブラウザで開いてください。')
    }
    return () => {
      worker?.terminate()
      workerRef.current = null
      if (exportTimer.current) clearTimeout(exportTimer.current)
    }
  }, [])

  const command = useCallback((value: WorkerCommand) => workerRef.current?.postMessage(value), [])
  const start = useCallback((config: SimulationConfig) => {
    setError(null)
    setProgress({ ...emptyProgress(), status: 'running', seed: config.seed })
    command({ type: 'START', config })
  }, [command])
  const pause = useCallback(() => command({ type: 'PAUSE' }), [command])
  const resume = useCallback(() => command({ type: 'RESUME' }), [command])
  const reset = useCallback(() => {
    setError(null)
    setProgress(emptyProgress())
    command({ type: 'RESET' })
  }, [command])
  const setMonitor = useCallback((monitor: boolean) => command({ type: 'SET_DISPLAY', monitor }), [command])
  const setSpeed = useCallback((speed: Speed) => command({ type: 'SET_SPEED', speed }), [command])
  const exportResults = useCallback(() => {
    setExporting(true)
    command({ type: 'EXPORT' })
    exportTimer.current = setTimeout(() => { setExporting(false); setError('CSVの作成がタイムアウトしました。もう一度お試しください。') }, 10_000)
  }, [command])
  return { progress, error, ready, exporting, start, pause, resume, reset, setMonitor, setSpeed, exportResults }
}
