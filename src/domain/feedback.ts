import type { Color } from 'chess.js'

export type Score = { kind: 'cp' | 'mate'; value: number }
export const DROP_THRESHOLD = 150

export function whiteScore(score: Score, turn: Color): Score {
  return { ...score, value: score.value * (turn === 'w' ? 1 : -1) }
}

export function moveFeedback(before: Score, after: Score, player: Color): string | undefined {
  const sign = player === 'w' ? 1 : -1
  const a = before.value * sign
  const b = after.value * sign
  if (after.kind === 'mate' && b < 0 && !(before.kind === 'mate' && a < 0)) {
    return 'This move allows a forced mate. Look for threats against your king.'
  }
  if (before.kind === 'mate' && a > 0 && !(after.kind === 'mate' && b > 0)) {
    return 'A forced mating opportunity has slipped away.'
  }
  if (before.kind === 'cp' && after.kind === 'cp' && a - b >= DROP_THRESHOLD) {
    return `Worth a second look: the evaluation fell by ${((a - b) / 100).toFixed(1)} pawns. You can undo and try another idea.`
  }
}
