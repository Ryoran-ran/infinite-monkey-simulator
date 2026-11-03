/// <reference lib="webworker" />
import type { WorkerCommand, WorkerEvent } from '../types/simulation'
import { SimulationRuntime } from '../simulation/runtime'

const scope = self as unknown as DedicatedWorkerGlobalScope
const runtime = new SimulationRuntime((event: WorkerEvent) => scope.postMessage(event), {
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
})
scope.onmessage = (event: MessageEvent<WorkerCommand>) => runtime.handle(event.data)
