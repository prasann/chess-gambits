import { describe, expect, it } from 'vitest'
import { SearchCancelled, Stockfish, type EngineWorker } from './stockfish'

class FakeWorker implements EngineWorker {
  onmessage: EngineWorker['onmessage'] = null
  onerror: EngineWorker['onerror'] = null
  commands: string[] = []
  terminated = false
  autoReply = true
  emit(line: string) { this.onmessage?.({ data: line } as MessageEvent) }
  postMessage(command: string) {
    this.commands.push(command)
    if (command === 'uci') {
      this.emit('option name Skill Level type spin default 20 min 0 max 20')
      this.emit('option name UCI_LimitStrength type check default false')
      this.emit('uciok')
    }
    if (command === 'isready') this.emit('readyok')
    if (command.startsWith('go') && this.autoReply) {
      queueMicrotask(() => { this.emit('info depth 12 score cp 50'); this.emit('bestmove e2e4') })
    }
  }
  terminate() { this.terminated = true }
}

describe('UCI adapter', () => {
  it('handshakes, applies strength, and keeps feedback analysis unrestricted', async () => {
    const worker = new FakeWorker()
    const engine = new Stockfish(() => worker)
    await engine.search([], 'relaxed')
    expect(worker.commands.slice(0, 2)).toEqual(['uci', 'setoption name Hash value 16'])
    expect(worker.commands).toContain('setoption name Skill Level value 0')
    expect(await engine.evaluate(['e2e4'])).toEqual({ kind: 'cp', value: -50 })
    expect(worker.commands).toContain('setoption name Skill Level value 20')
    expect(worker.commands).toContain('setoption name UCI_LimitStrength value false')
    engine.cancel()
  })
  it('serializes searches and rejects queued/in-flight results on cancellation', async () => {
    const workers: FakeWorker[] = []
    const engine = new Stockfish(() => {
      const worker = new FakeWorker()
      worker.autoReply = false
      workers.push(worker)
      return worker
    })
    const first = engine.search([], 'relaxed')
    const rejected = expect(first).rejects.toBeInstanceOf(SearchCancelled)
    const second = engine.search(['e2e4'], 'club')
    const queuedRejected = expect(second).rejects.toBeInstanceOf(SearchCancelled)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(workers[0].commands.filter((command) => command.startsWith('go')).length).toBe(1)
    engine.cancel()
    await rejected
    await queuedRejected
    expect(workers[0].terminated).toBe(true)
    const third = engine.search([], 'challenging')
    await new Promise((resolve) => setTimeout(resolve, 0))
    workers[0].emit('bestmove a2a4')
    workers[1].emit('bestmove d2d4')
    expect((await third).move).toBe('d2d4')
    engine.cancel()
  })
  it('surfaces worker load errors and supports a fresh retry', async () => {
    const worker = new FakeWorker()
    worker.autoReply = false
    const engine = new Stockfish(() => worker)
    const search = engine.search([], 'club')
    const failed = expect(search).rejects.toThrow(/could not load/)
    await new Promise((resolve) => setTimeout(resolve, 0))
    worker.onerror?.({} as ErrorEvent)
    await failed
    expect(worker.terminated).toBe(true)
    worker.autoReply = true
    expect((await engine.search([], 'club')).move).toBe('e2e4')
    engine.cancel()
  })
  it('does not use bound-only or shallow evaluations as feedback', async () => {
    const worker = new FakeWorker()
    worker.autoReply = false
    const engine = new Stockfish(() => worker)
    const result = engine.evaluate([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    worker.emit('info depth 15 score cp 300 lowerbound')
    worker.emit('bestmove e2e4')
    expect(await result).toBeUndefined()
    const shallow = engine.evaluate([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    worker.emit('info depth 4 score cp 300')
    worker.emit('bestmove e2e4')
    expect(await shallow).toBeUndefined()
    engine.cancel()
  })
})
