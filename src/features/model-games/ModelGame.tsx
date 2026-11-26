import { useMemo, useState, type KeyboardEvent } from 'react'
import { Chess } from 'chess.js'
import { Board } from '../../components/Board'
import { ideaTitles } from '../../components/Ideas'
import { moveLabel, parseModelGame, terminalResult, type ModelGame } from '../../domain/modelGame'
import type { Gambit } from '../../domain/gambit'

const kindLabels: Record<ModelGame['kind'], string> = { 'gambit-works': 'Gambit works', 'defense-holds': 'Defense holds' }
const resultText = (result: ModelGame['result']) => result === '1/2-1/2' ? '½–½' : result

export function practiceFromHref(gambit: Gambit, game: ModelGame, ply: number) {
  return `#/practice/${gambit.id}?game=${game.id}&ply=${ply}`
}

function flashIdea(key: string) {
  const target = document.getElementById(`idea-${key}`)
  if (!target) return
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  target.classList.remove('flash')
  void target.offsetWidth
  target.classList.add('flash')
}

export function ModelGames({ gambit, initialGame, initialPly }: { gambit: Gambit; initialGame?: string; initialPly?: number }) {
  const games = gambit.modelGames ?? []
  const start = games.find((game) => game.id === initialGame) ?? games[0]
  const [gameId, setGameId] = useState(start?.id)
  const game = games.find((item) => item.id === gameId)
  const parsed = useMemo(() => game && parseModelGame(game), [game])
  const [ply, setPly] = useState(() => {
    if (!start) return 0
    const total = parseModelGame(start).san.length
    const valid = start.id === initialGame && initialPly !== undefined && Number.isInteger(initialPly) && initialPly >= 0 && initialPly <= total
    return valid ? initialPly : start.moments[0].ply
  })
  if (!game || !parsed) return null

  const total = parsed.san.length
  const board = new Chess(parsed.fens[ply])
  const momentIndex = game.moments.findIndex((moment) => moment.ply === ply)
  const moment = game.moments[momentIndex]
  const nextMoment = game.moments.find((item) => item.ply > ply)
  const terminal = terminalResult(board)
  const canPractice = ply >= gambit.setup.length && !terminal
  const here = ply ? moveLabel(ply, parsed.san[ply - 1]) : 'Start'
  const go = (value: number) => setPly(Math.max(0, Math.min(total, value)))

  function keys(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest('select, input, summary')) return
    const actions: Record<string, () => void> = { ArrowLeft: () => go(ply - 1), ArrowRight: () => go(ply + 1), Home: () => go(0), End: () => go(total) }
    const action = actions[event.key]
    if (action) { event.preventDefault(); action() }
  }

  return <section className="model-games" id="model-games" aria-labelledby="model-games-title" tabIndex={-1} onKeyDown={keys}>
    <div className="model-heading">
      <div><span className="eyebrow">Model games</span><h2 id="model-games-title">See the ideas at work.</h2></div>
      <div className="filter-tabs" role="group" aria-label="Choose a model game">
        {games.map((item) => <button key={item.id} aria-pressed={item.id === game.id} onClick={() => { setGameId(item.id); setPly(item.moments[0].ply) }}>{kindLabels[item.kind]}</button>)}
      </div>
    </div>
    <div className="model-layout">
      <div className="model-board-column">
        <p className="model-players" data-testid="model-players"><strong>{game.white} – {game.black}</strong>
          <span>{game.event}, {game.site} {game.year} · {resultText(game.result)}{game.timeControl !== 'classical' && <span className="tc-badge">{game.timeControl}</span>}</span></p>
        <Board id="model-board" label={`Model game board, ${ply ? `after ${here}` : 'starting position'}`} game={board} side={gambit.side}
          arrows={moment?.arrows ?? []} highlights={moment?.highlights ?? []} />
        <div className="model-controls" role="group" aria-label="Replay controls">
          <button onClick={() => go(0)} disabled={ply === 0} aria-label="First move">⏮</button>
          <button onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">‹</button>
          <span className="model-ply" data-testid="model-ply">{here}</span>
          <button onClick={() => go(ply + 1)} disabled={ply === total} aria-label="Next move">›</button>
          <button onClick={() => go(total)} disabled={ply === total} aria-label="Last move">⏭</button>
        </div>
      </div>
      <div className="model-side">
        <div className="moment-card" aria-live="polite" data-testid="moment-card">
          {moment ? <>
            <span className="eyebrow">Moment {momentIndex + 1} of {game.moments.length} · {here}</span>
            <h3>{moment.title}</h3>
            <p>{moment.note}</p>
            {moment.idea && <button className="idea-chip" onClick={() => flashIdea(moment.idea!)}>Idea: {ideaTitles[moment.idea]}</button>}
          </> : <>
            <span className="eyebrow">{ply ? `After ${here}` : 'Starting position'}</span>
            <p>{ply === total ? `Final position. The game ended ${game.result === '1/2-1/2' ? 'in a draw' : resultText(game.result)}.` : game.summary}</p>
          </>}
          <div className="moment-actions">
            {nextMoment
              ? <button onClick={() => go(nextMoment.ply)}>Next moment <span aria-hidden="true">→</span></button>
              : <button onClick={() => go(game.moments[0].ply)}>Back to first moment</button>}
          </div>
        </div>
        {canPractice
          ? <a className="primary-button full-width" href={practiceFromHref(gambit, game, ply)} data-testid="practice-from-here">Practice from here <span aria-hidden="true">↗</span></a>
          : <button className="primary-button full-width" disabled data-testid="practice-from-here">{terminal ? 'Game over — nothing to play' : 'Step forward to the gambit to practice'}</button>}
        <p className="fine-print">You take the {gambit.side} pieces from this position. Stockfish plays the rest, with no opening book.</p>
        <details className="panel model-moves">
          <summary>All moves <span className="muted">{total} plies</span></summary>
          <ol className="move-list" aria-label="Model game moves">
            {parsed.san.map((san, index) => <li key={index} className={index + 1 === ply ? 'current' : ''}>
              <button onClick={() => go(index + 1)} aria-current={index + 1 === ply ? 'step' : undefined}>
                {index % 2 === 0 && <span className="move-number">{index / 2 + 1}.</span>}{san}
                {game.moments.some((item) => item.ply === index + 1) && <span className="moment-dot" title="Key moment" />}
              </button>
            </li>)}
          </ol>
        </details>
        <p className="model-source">Moves from the <a href={game.source.url} target="_blank" rel="noreferrer">{game.source.name}</a>. Notes written for Gambit Lab.</p>
      </div>
    </div>
  </section>
}
