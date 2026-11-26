import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Chess } from 'chess.js'
import { Board } from '../src/components/Board'
import '../src/styles/app.css'

function Fixture() {
  const [game, setGame] = useState(new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1'))
  return <div style={{ maxWidth: 480 }}>
    <Board game={game} side="white" interactive onMove={(move) => {
      const next = new Chess(game.fen())
      next.move(move)
      setGame(next)
    }} />
  </div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
