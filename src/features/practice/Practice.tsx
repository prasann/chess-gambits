import { useEffect, useMemo, useRef, useState } from 'react'
import { Board } from '../../components/Board'
import { Ideas } from '../../components/Ideas'
import { bookReply, compileBook, cursorAt, gameResult, playerColor, replay, setupMoves, uci, undoDecision, type Gambit } from '../../domain/gambit'
import { moveFeedback } from '../../domain/feedback'
import { SearchCancelled, Stockfish, strengths, type Strength } from '../../engine/stockfish'

export function Practice({ gambit }: { gambit: Gambit }) {
  const setup = useMemo(() => setupMoves(gambit), [gambit])
  const book = useMemo(() => compileBook(gambit), [gambit])
  const [moves, setMoves] = useState<string[]>([])
  const [settingUp, setSettingUp] = useState(true)
  const [strength, setStrength] = useState<Strength>('relaxed')
  const [hidden, setHidden] = useState(document.hidden)
  const [status, setStatus] = useState('Setting the scene...')
  const [feedback, setFeedback] = useState<string>()
  const [error, setError] = useState<string>()
  const [retry, setRetry] = useState(0)
  const [engine] = useState(() => new Stockfish())
  const lastHuman = useRef<{ before: string[]; after: string[] } | null>(null)
  const game = useMemo(() => replay(moves), [moves])
  const cursor = cursorAt(book, moves.slice(setup.length))
  const inBook = moves.length >= setup.length && !!cursor?.children.size
  const result = gameResult(game)
  const humanTurn = game.turn() === playerColor(gambit)
  const canPlay = !settingUp && !hidden && !error && !result && humanTurn

  useEffect(() => {
    const visibility = () => {
      if (document.hidden) engine.cancel()
      setHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      engine.cancel()
    }
  }, [engine])

  useEffect(() => {
    if (!settingUp || hidden) return
    if (moves.length >= setup.length) return
    const timer = setTimeout(() => {
      const next = setup.slice(0, moves.length + 1)
      setMoves(next)
      if (next.length === setup.length) setSettingUp(false)
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280)
    return () => clearTimeout(timer)
  }, [settingUp, hidden, moves.length, setup])

  useEffect(() => {
    if (settingUp || hidden || result || error) return
    let active = true
    let working = true
    const computer = async () => {
      try {
        const human = lastHuman.current
        if (human && human.after.join(' ') === moves.join(' ') && !inBook) {
          setStatus('Checking your idea...')
          const before = await engine.evaluate(human.before)
          const after = await engine.evaluate(human.after)
          if (!active) return
          setFeedback(before && after
            ? moveFeedback(before, after, playerColor(gambit)) ?? 'No major evaluation drop detected in this quick check.'
            : 'Feedback unavailable: the quick analysis did not reach enough depth.')
          lastHuman.current = null
        }
        if (!active) return
        if (humanTurn) { setStatus('Your move. Put the idea into practice.'); return }
        const reply = bookReply(gambit, cursor, game)
        if (reply) {
          setStatus('Choosing a reply from recorded games...')
          await new Promise((resolve) => setTimeout(resolve, 420))
          if (!active) return
          setMoves([...moves, reply])
        } else {
          setStatus('Stockfish is thinking...')
          const answer = await engine.search(moves, strength)
          if (!active) return
          const position = replay(moves)
          const legal = position.moves({ verbose: true }).some((move) => uci(move) === answer.move)
          if (!legal) throw new Error('The engine returned an invalid move. Retry to restart it.')
          setMoves([...moves, answer.move])
        }
      } catch (cause) {
        if (!active || cause instanceof SearchCancelled) return
        engine.cancel()
        setError(cause instanceof Error ? cause.message : 'The computer could not continue.')
      }
    }
    void computer().finally(() => { working = false })
    return () => { active = false; if (working) engine.cancel() }
  }, [moves, strength, hidden, settingUp, result, error, retry, gambit, book, engine, cursor, game, humanTurn, inBook])

  function move(value: string) {
    if (!canPlay) return
    const next = [...moves, value]
    lastHuman.current = { before: moves, after: next }
    setFeedback(undefined)
    setMoves(next)
  }
  function reset() {
    engine.cancel()
    lastHuman.current = null
    setError(undefined)
    setFeedback(undefined)
    setMoves([])
    setSettingUp(true)
    setStatus('Setting the scene...')
  }
  function undo() {
    engine.cancel()
    lastHuman.current = null
    setError(undefined)
    setFeedback(undefined)
    setMoves([...undoDecision(gambit, moves)])
  }

  return <main className="practice-page">
    <div className="practice-heading">
      <a className="back-link" href={`#/gambit/${gambit.id}`}>Back to ideas</a>
      <h1>{gambit.name}</h1>
      <span className="muted">You play {gambit.side}</span>
    </div>
    <div className="practice-layout">
      <section className="play-column" aria-label="Practice position">
        <div className="opponent-label"><span className="avatar">SF</span><span>Practice partner <small>Recorded games + Stockfish 19</small></span><span className="live-dot" /></div>
        <Board key={`${gambit.id}-${moves.length < setup.length ? 'setup' : moves.join('-')}`} game={game} side={gambit.side} interactive={!!canPlay} onMove={move} />
        <p className="sr-only" aria-live="polite" aria-atomic="true">{!settingUp && moves.length ? `${moves.length % 2 ? 'White' : 'Black'} played ${game.history().at(-1)}.` : ''}</p>
        <div className="practice-controls">
          <div className="control-status">
            <span className={`source-badge ${inBook ? 'book' : ''}`} data-testid="move-source">{settingUp ? 'Setup' : inBook ? 'Opening book' : 'Stockfish'}</span>
            <span className="turn-label">{hidden ? 'Paused' : result ? 'Game over' : humanTurn ? 'Your turn' : "Partner's turn"}</span>
          </div>
          <div className="control-actions">
            <button onClick={undo} disabled={settingUp || moves.length <= setup.length + (humanTurn ? 1 : 0)} aria-label="Undo last turn">Undo</button>
            <button onClick={reset}>Restart</button>
            <label className="strength-label"><span className="sr-only">Engine strength</span>
              <select aria-label="Engine strength" value={strength} onChange={(event) => setStrength(event.target.value as Strength)}>
                {Object.entries(strengths).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}
              </select>
            </label>
          </div>
          <p className="game-status" aria-live="polite" data-testid="game-status">{hidden ? 'Practice paused while this tab is hidden.' : result ?? (error ? 'The computer needs attention.' : status)}</p>
          {settingUp && <button className="skip-button" onClick={() => { setMoves(setup); setSettingUp(false) }}>Skip setup</button>}
          {error && <div className="error-box" role="alert"><p>{error}</p><button onClick={() => { engine.cancel(); setError(undefined); setRetry((count) => count + 1) }}>Retry engine</button></div>}
          {feedback && <p className="feedback" aria-live="polite">{feedback}</p>}
        </div>
        <p className="input-hint">Tap a piece, then a square. Keyboard: Tab to a square and press Enter.</p>
      </section>
      <aside className="practice-sidebar">
        <details className="panel">
          <summary>Move history <span className="muted">{moves.length} plies</span></summary>
          <ol className="move-list" aria-label="Played moves" data-testid="move-history">
            {game.history().map((san, index) => <li key={index} className={index < setup.length ? 'setup-move' : ''}>
              {index % 2 === 0 && <span className="move-number">{Math.floor(index / 2) + 1}.</span>}{san}
            </li>)}
          </ol>
          <p className="fine-print">Faded moves set up the gambit. A new move can leave the book without being a mistake.</p>
        </details>
        <details className="panel ideas-panel">
          <summary>The ideas, not the answers</summary>
          <Ideas gambit={gambit} compact />
        </details>
        <div className="practice-note"><span className="eyebrow">A useful reminder</span><p>{gambit.ideas.caution}</p></div>
      </aside>
    </div>
  </main>
}
