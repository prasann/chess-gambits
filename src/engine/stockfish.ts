import { replay } from '../domain/gambit'
import { whiteScore, type Score } from '../domain/feedback'

export type Strength = 'relaxed' | 'club' | 'challenging'
export const strengths: Record<Strength, { label: string; skill: number; ms: number }> = {
  relaxed: { label: 'Relaxed', skill: 0, ms: 250 },
  club: { label: 'Club challenge', skill: 5, ms: 450 },
  challenging: { label: 'Challenging', skill: 12, ms: 700 },
}
export interface SearchResult { move: string; score?: Score; depth: number }
export interface EngineWorker {
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: string): void
  terminate(): void
}
export class SearchCancelled extends Error {
  constructor() { super('Engine search cancelled') }
}
type Listener = { line: (line: string) => void; reject: (error: Error) => void }

export class Stockfish {
  private worker?: EngineWorker
  private ready?: Promise<void>
  private listeners = new Set<Listener>()
  private options = new Set<string>()
  private generation = 0
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private createWorker: () => EngineWorker = () =>
    new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`)) {}

  private waitFor<T>(parse: (line: string) => T | undefined, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        this.listeners.delete(listener)
      }
      const listener: Listener = {
        line: (line) => {
          const value = parse(line)
          if (value !== undefined) { cleanup(); resolve(value) }
        },
        reject: (error) => { cleanup(); reject(error) },
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Stockfish timed out. Retry the engine.'))
      }, timeout)
      this.listeners.add(listener)
    })
  }

  private send(command: string) {
    if (!this.worker) throw new SearchCancelled()
    this.worker.postMessage(command)
  }

  private initialize(): Promise<void> {
    if (this.ready) return this.ready
    this.ready = (async () => {
      if (typeof WebAssembly === 'undefined') throw new Error('This browser does not support WebAssembly.')
      this.worker = this.createWorker()
      this.worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        for (const line of String(data).split('\n')) {
          const option = /^option name (.+?) type /.exec(line)
          if (option) this.options.add(option[1])
          for (const listener of [...this.listeners]) listener.line(line)
        }
      }
      this.worker.onerror = () => {
        const error = new Error('Stockfish could not load. Check the connection and retry.')
        for (const listener of [...this.listeners]) listener.reject(error)
        this.cancel()
      }
      const uci = this.waitFor((line) => line === 'uciok' ? true : undefined, 20000)
      this.send('uci')
      await uci
      if (!this.options.has('Skill Level')) throw new Error('This engine does not expose the required Skill Level option.')
      this.send('setoption name Hash value 16')
      const ready = this.waitFor((line) => line === 'readyok' ? true : undefined, 10000)
      this.send('isready')
      await ready
    })()
    return this.ready
  }

  search(moves: readonly string[], strength: Strength | 'analysis'): Promise<SearchResult> {
    const generation = this.generation
    const run = async () => {
      if (generation !== this.generation) throw new SearchCancelled()
      await this.initialize()
      if (generation !== this.generation) throw new SearchCancelled()
      const analysis = strength === 'analysis'
      const skill = analysis ? 20 : strengths[strength].skill
      const ms = analysis ? 350 : strengths[strength].ms
      if (this.options.has('UCI_LimitStrength')) this.send('setoption name UCI_LimitStrength value false')
      this.send(`setoption name Skill Level value ${skill}`)
      this.send(`position startpos${moves.length ? ` moves ${moves.join(' ')}` : ''}`)
      let score: Score | undefined
      let depth = 0
      const result = this.waitFor<SearchResult>((line) => {
        const info = /\bscore (cp|mate) (-?\d+)/.exec(line)
        if (info && !/\b(lowerbound|upperbound)\b/.test(line)) {
          score = { kind: info[1] as Score['kind'], value: Number(info[2]) }
          depth = Number(/\bdepth (\d+)/.exec(line)?.[1] ?? 0)
        }
        const best = /^bestmove (\S+)/.exec(line)
        return best ? { move: best[1], score, depth } : undefined
      }, ms + 10000)
      this.send(`go movetime ${ms}`)
      return result
    }
    const task = this.queue.then(run)
    this.queue = task.then(() => undefined, () => undefined)
    return task
  }

  async evaluate(moves: readonly string[]) {
    const result = await this.search(moves, 'analysis')
    return result.score && result.depth >= 8 ? whiteScore(result.score, replay(moves).turn()) : undefined
  }

  cancel() {
    this.generation++
    if (this.worker) {
      this.worker.postMessage('stop')
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.terminate()
    }
    this.worker = undefined
    this.ready = undefined
    this.options.clear()
    for (const listener of [...this.listeners]) listener.reject(new SearchCancelled())
    this.queue = Promise.resolve()
  }
}
