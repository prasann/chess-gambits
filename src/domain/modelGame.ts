import { Chess, type Color } from 'chess.js'
import { z } from 'zod'

const text = z.string().trim().min(1)
const square = z.string().regex(/^[a-h][1-8]$/)
export const ideaKeys = ['idea', 'structure', 'pieces', 'motifs', 'declined', 'caution'] as const

export const modelGameSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(['gambit-works', 'defense-holds']),
  white: text,
  black: text,
  event: text,
  site: text,
  year: z.number().int().min(1800).max(2100),
  timeControl: z.enum(['classical', 'rapid', 'blitz']),
  result: z.enum(['1-0', '0-1', '1/2-1/2']),
  moves: text,
  source: z.strictObject({
    name: text,
    url: z.url({ protocol: /^https$/ }),
    retrievedAt: z.iso.date(),
  }),
  summary: text.max(400),
  moments: z.array(z.strictObject({
    ply: z.number().int().min(1),
    title: text.max(60),
    note: text.max(280),
    idea: z.enum(ideaKeys).optional(),
    arrows: z.array(z.union([z.tuple([square, square]), z.tuple([square, square, z.literal('red')])])).max(3).optional(),
    highlights: z.array(square).max(4).optional(),
  })).min(4).max(6),
})

export type ModelGame = z.infer<typeof modelGameSchema>
export type Moment = ModelGame['moments'][number]

export interface ParsedGame {
  san: string[]
  uci: string[]
  /** FEN after each ply; index 0 is the start position. */
  fens: string[]
}

const cache = new WeakMap<ModelGame, ParsedGame>()

export function movetextTokens(movetext: string) {
  return movetext
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^\d+\.(\.\.)?/, ''))
    .filter((token) => token && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token) && !/^\$\d+$/.test(token))
}

export function parseModelGame(game: ModelGame): ParsedGame {
  const cached = cache.get(game)
  if (cached) return cached
  const board = new Chess()
  const parsed: ParsedGame = { san: [], uci: [], fens: [board.fen()] }
  for (const token of movetextTokens(game.moves)) {
    let move
    try { move = board.move(token) } catch { throw new Error(`${game.id}: illegal move ${token} at ply ${parsed.san.length + 1}`) }
    parsed.san.push(move.san)
    parsed.uci.push(`${move.from}${move.to}${move.promotion ?? ''}`)
    parsed.fens.push(board.fen())
  }
  cache.set(game, parsed)
  return parsed
}

export function terminalResult(game: Chess): ModelGame['result'] | undefined {
  if (game.isCheckmate()) return game.turn() === 'w' ? '0-1' : '1-0'
  if (game.isDraw()) return '1/2-1/2'
  return undefined
}

export function moveLabel(ply: number, san: string) {
  return `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'}${san}`
}

export function validateModelGames(gambit: { id: string; side: 'white' | 'black'; setup: string[]; modelGames?: ModelGame[] }) {
  if (!gambit.modelGames) return
  const player: Color = gambit.side === 'white' ? 'w' : 'b'
  const win = player === 'w' ? '1-0' : '0-1'
  const kinds = gambit.modelGames.map((game) => game.kind).sort()
  if (kinds.join() !== 'defense-holds,gambit-works') throw new Error(`${gambit.id}: needs exactly one gambit-works and one defense-holds model game`)
  if (new Set(gambit.modelGames.map((game) => game.id)).size !== gambit.modelGames.length) throw new Error(`${gambit.id}: duplicate model game id`)
  const setup = new Chess()
  const prefix = gambit.setup.map((move) => setup.move(move).san)
  for (const game of gambit.modelGames) {
    const parsed = parseModelGame(game)
    if (prefix.some((san, index) => parsed.san[index] !== san)) throw new Error(`${game.id}: must begin with the gambit setup`)
    if (parsed.san.length <= prefix.length) throw new Error(`${game.id}: must continue past the setup`)
    if (game.kind === 'gambit-works' && game.result !== win) throw new Error(`${game.id}: a gambit-works game must be won by the gambit side`)
    if (game.kind === 'defense-holds' && game.result === win) throw new Error(`${game.id}: a defense-holds game must be a draw or a defender win`)
    const terminal = terminalResult(new Chess(parsed.fens.at(-1)))
    if (terminal && terminal !== game.result) throw new Error(`${game.id}: result does not match the final position`)
    let last = 0
    for (const moment of game.moments) {
      if (moment.ply <= last) throw new Error(`${game.id}: moment plies must be unique and ascending`)
      if (moment.ply < prefix.length) throw new Error(`${game.id}: moments start at the gambit offer`)
      if (moment.ply > parsed.san.length) throw new Error(`${game.id}: moment ply ${moment.ply} is beyond the game`)
      last = moment.ply
    }
  }
}
