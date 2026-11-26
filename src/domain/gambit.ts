import { Chess, type Color } from 'chess.js'
import { z } from 'zod'

const text = z.string().trim().min(1)
export const gambitSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: text,
  side: z.enum(['white', 'black']),
  subtitle: text,
  character: text,
  ideas: z.strictObject({
    idea: text,
    structure: text,
    pieces: text,
    motifs: text,
    declined: text,
    caution: text,
  }),
  setup: z.array(text).min(1),
  lines: z.array(z.strictObject({ name: text, moves: z.array(text).min(1) })).min(3),
  source: z.strictObject({
    name: text,
    url: z.url({ protocol: /^https$/ }),
    retrievedAt: z.iso.date(),
    note: text,
  }),
  frequencies: z.record(z.string(), z.strictObject({
    total: z.number().int().positive(),
    counts: z.record(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/), z.number().int().positive()),
  })),
})

export type Gambit = z.infer<typeof gambitSchema>
export interface BookNode {
  children: Map<string, BookNode>
  label?: string
}
export const playerColor = (gambit: Gambit): Color => gambit.side === 'white' ? 'w' : 'b'
export const positionKey = (game: Chess) => game.fen().split(' ').slice(0, 4).join(' ')
export const uci = (move: { from: string; to: string; promotion?: string }) =>
  `${move.from}${move.to}${move.promotion ?? ''}`

export function explorerUci(game: Chess, move: string) {
  const legal = game.moves({ verbose: true })
  const direct = legal.find((candidate) => uci(candidate) === move)
  if (direct) return uci(direct)
  // The explorer encodes castling as king-to-rook, even in standard chess.
  const castling: Record<string, string> = { e1h1: 'O-O', e1a1: 'O-O-O', e8h8: 'O-O', e8a8: 'O-O-O' }
  const castle = legal.find((candidate) => candidate.from === move.slice(0, 2) && candidate.san.replace(/[+#]/g, '') === castling[move])
  if (!castle) throw new Error(`Explorer returned an illegal move ${move} at ${game.fen()}`)
  return uci(castle)
}

export function replay(moves: readonly string[], fen?: string) {
  const game = new Chess(fen)
  for (const move of moves) game.move(move)
  return game
}

export function setupMoves(gambit: Gambit) {
  const game = new Chess()
  return gambit.setup.map((move) => uci(game.move(move)))
}

export function compileBook(gambit: Gambit): BookNode {
  const root: BookNode = { children: new Map() }
  const unique = new Set<string>()
  for (const line of gambit.lines) {
    const game = replay(gambit.setup)
    let node = root
    const path: string[] = []
    for (const move of line.moves) {
      const key = uci(game.move(move))
      path.push(key)
      if (!node.children.has(key)) node.children.set(key, { children: new Map() })
      node = node.children.get(key)!
    }
    if (unique.has(path.join(' '))) throw new Error(`${gambit.id}: duplicate line ${line.name}`)
    if (node.label) throw new Error(`${gambit.id}: ambiguous line ${line.name}`)
    node.label = line.name
    unique.add(path.join(' '))
  }
  return root
}

export function cursorAt(root: BookNode, moves: readonly string[]): BookNode | undefined {
  let node: BookNode | undefined = root
  for (const move of moves) node = node?.children.get(move)
  return node
}

export function validateGambit(input: unknown, requireFrequencies = true): Gambit {
  const gambit = gambitSchema.parse(input)
  const game = replay(gambit.setup)
  if (game.turn() === playerColor(gambit)) throw new Error(`${gambit.id}: setup must end with the player's offer`)
  const root = compileBook(gambit)
  for (const [key, frequency] of Object.entries(gambit.frequencies)) {
    if (key.split(' ').length !== 4) throw new Error(`${gambit.id}: invalid frequency position key`)
    const position = new Chess(`${key} 0 1`)
    const legal = new Set(position.moves({ verbose: true }).map(uci))
    if (Object.keys(frequency.counts).some((move) => !legal.has(move))) {
      throw new Error(`${gambit.id}: illegal move in source counts at ${key}`)
    }
    if (Object.values(frequency.counts).reduce((a, b) => a + b, 0) > frequency.total) {
      throw new Error(`${gambit.id}: counts exceed source sample size`)
    }
  }
  const visit = (node: BookNode, position: Chess) => {
    if (node.label && node.children.size) throw new Error(`${gambit.id}: a line is a prefix of another`)
    if (requireFrequencies && node.children.size && position.turn() !== playerColor(gambit)) {
      const frequency = gambit.frequencies[positionKey(position)]
      if (!frequency) throw new Error(`${gambit.id}: missing frequencies for ${position.fen()}`)
      for (const move of node.children.keys()) {
        if (!frequency.counts[move]) throw new Error(`${gambit.id}: missing observed count for ${move} at ${position.fen()}`)
      }
    }
    for (const [move, child] of node.children) {
      position.move(move)
      visit(child, position)
      position.undo()
    }
  }
  visit(root, game)
  return gambit
}

export function weightedChoice<T>(choices: readonly { value: T; weight: number }[], random = Math.random): T {
  if (!choices.length || choices.some(({ weight }) => !Number.isFinite(weight) || weight <= 0)) {
    throw new Error('Reply selection requires positive finite weights')
  }
  const total = choices.reduce((sum, item) => sum + item.weight, 0)
  const draw = random()
  if (!Number.isFinite(total) || !Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new Error('Invalid reply distribution or random sample')
  }
  let remaining = draw * total
  for (const choice of choices) {
    remaining -= choice.weight
    if (remaining < 0) return choice.value
  }
  return choices[choices.length - 1].value
}

export function bookReply(gambit: Gambit, node: BookNode | undefined, game: Chess, random = Math.random) {
  if (!node?.children.size) return undefined
  const observed = gambit.frequencies[positionKey(game)]
  if (!observed) throw new Error('Opening frequency data is missing')
  return weightedChoice([...node.children.keys()].map((move) => ({
    value: move, weight: observed.counts[move],
  })), random)
}

export function undoDecision(gambit: Gambit, moves: readonly string[]) {
  const floor = gambit.setup.length
  let end = moves.length - 1
  while (end > floor && replay(moves.slice(0, end)).turn() !== playerColor(gambit)) end--
  return moves.slice(0, Math.max(floor, end))
}

export function gameResult(game: Chess) {
  if (game.isCheckmate()) return `Checkmate. ${game.turn() === 'w' ? 'Black' : 'White'} wins.`
  if (game.isStalemate()) return 'Draw by stalemate.'
  if (game.isInsufficientMaterial()) return 'Draw: insufficient material.'
  if (game.isThreefoldRepetition()) return 'Draw: threefold repetition.'
  if (game.isDrawByFiftyMoves()) return 'Draw: fifty-move rule.'
  return undefined
}
