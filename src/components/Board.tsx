import { useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, type PieceRenderObject } from 'react-chessboard'
import { type Chess, type Square } from 'chess.js'
import { pieceUrl, usePieceSet, type PieceSet } from '../pieceSets'

const pieceNames: Record<string, string> = { P: 'pawn', R: 'rook', N: 'knight', B: 'bishop', Q: 'queen', K: 'king' }
const pieceCodes = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']

function renderPieces(set: PieceSet): PieceRenderObject {
  return Object.fromEntries(pieceCodes.map((code) => [code, () => (
    <img src={pieceUrl(set, code)} alt="" aria-hidden="true" draggable={false} className={`chess-piece ${code[0]}`} />
  )]))
}

interface Props {
  game: Chess
  side: 'white' | 'black'
  interactive?: boolean
  onMove?: (move: string) => void
}

export function Board({ game, side, interactive = false, onMove }: Props) {
  const [selected, setSelected] = useState<Square | null>(null)
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  const pieceSet = usePieceSet()
  const pieces = useMemo(() => renderPieces(pieceSet), [pieceSet])
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const legal = selected && interactive ? game.moves({ square: selected, verbose: true }) : []
  const history = game.history({ verbose: true })
  const last = history.at(-1)
  const styles: Record<string, CSSProperties> = {}
  if (last) {
    styles[last.from] = { boxShadow: 'inset 0 0 0 100px var(--cp-board-last-move)' }
    styles[last.to] = { boxShadow: 'inset 0 0 0 100px var(--cp-board-last-move)' }
  }
  if (selected) styles[selected] = { boxShadow: 'inset 0 0 0 4px var(--cp-accent)' }
  for (const move of legal) {
    styles[move.to] = { ...styles[move.to], backgroundImage: 'radial-gradient(var(--cp-accent) 17%, transparent 20%)' }
  }
  if (game.isCheck()) {
    const king = game.board().flat().find((piece) => piece?.type === 'k' && piece.color === game.turn())
    if (king) styles[king.square] = { boxShadow: 'inset 0 0 0 4px var(--cp-danger)' }
  }

  function attempt(from: string, to: string) {
    if (!interactive) return false
    const moves = game.moves({ verbose: true }).filter((move) => move.from === from && move.to === to)
    if (!moves.length) return false
    setSelected(null)
    if (moves.some((move) => move.promotion)) setPromotion({ from, to })
    else onMove?.(`${from}${to}`)
    return true
  }
  function click(square: Square) {
    if (!interactive) return
    if (selected && attempt(selected, square)) return
    setSelected(game.get(square)?.color === game.turn() ? square : null)
  }

  return <div className="board-frame" inert={!interactive} aria-label={`${side} side chessboard`}>
    <Chessboard options={{
      id: 'practice-board',
      position: game.fen(),
      boardOrientation: side,
      pieces,
      allowDragging: interactive && !coarse,
      allowAutoScroll: false,
      allowDrawingArrows: false,
      animationDurationInMs: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160,
      squareStyles: styles,
      boardStyle: { borderRadius: '0', overflow: 'hidden' },
      darkSquareStyle: { backgroundColor: 'var(--cp-board-dark)' },
      lightSquareStyle: { backgroundColor: 'var(--cp-board-light)' },
      darkSquareNotationStyle: { color: 'var(--cp-board-light)', fontWeight: 700 },
      lightSquareNotationStyle: { color: 'var(--cp-piece-black)', fontWeight: 700 },
      canDragPiece: ({ piece }) => interactive && piece.pieceType[0] === game.turn(),
      onSquareClick: ({ square }) => click(square as Square),
      onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? attempt(sourceSquare, targetSquare) : false,
      squareRenderer: ({ children, square, piece }) => (
        <button type="button" className="board-square" data-square={square}
          aria-label={`${square} ${piece ? `${piece.pieceType[0] === 'w' ? 'white' : 'black'} ${pieceNames[piece.pieceType[1]]}` : 'empty'}`}
          aria-disabled={!interactive} aria-pressed={selected === square}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              click(square as Square)
            }
          }}>
          {children}
        </button>
      ),
    }} />
    {promotion && interactive && <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Choose promotion"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setPromotion(null)
        if (event.key === 'Tab') {
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
          const first = buttons[0]
          const last = buttons.at(-1)
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
      }}>
      <div className="promotion-picker">
        <p>Promote your pawn</p>
        <div className="promotion-choices">
          {(['q', 'r', 'b', 'n'] as const).map((piece) => <button key={piece} autoFocus={piece === 'q'} onClick={() => {
            onMove?.(`${promotion.from}${promotion.to}${piece}`)
            setPromotion(null)
          }}><img src={pieceUrl(pieceSet, `${game.turn()}${piece.toUpperCase()}`)} alt="" aria-hidden="true" draggable={false} />
            <span>{({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[piece]}</span></button>)}
        </div>
        <button className="text-button" onClick={() => setPromotion(null)}>Cancel</button>
      </div>
    </div>}
  </div>
}
