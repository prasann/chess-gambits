import { describe, expect, it } from 'vitest'
import { gambits } from '../gambits'
import { bookReply, compileBook, cursorAt, explorerUci, gameResult, positionKey, replay, setupMoves, uci, undoDecision, validateGambit, weightedChoice } from './gambit'
import { moveFeedback, whiteScore } from './feedback'

describe('bundled repertoires', () => {
  for (const gambit of gambits) {
    it(`validates every branch and weighted computer decision in ${gambit.name}`, () => {
      expect(validateGambit(gambit)).toEqual(gambit)
      const root = compileBook(gambit)
      for (const line of gambit.lines) {
        const game = replay(gambit.setup)
        const path: string[] = []
        for (const san of line.moves) {
          expect(cursorAt(root, path)).toBeDefined()
          path.push(uci(game.move(san)))
        }
        expect(cursorAt(root, path)?.children.size).toBe(0)
        expect(cursorAt(root, path)?.label).toBe(line.name)
      }
    })
  }
  it('rejects illegal lines, wrong setup side, missing counts, duplicate and prefix lines', () => {
    const original = gambits[0]
    const change = () => structuredClone(original)
    const illegal = change()
    illegal.lines[0].moves[0] = 'a1a8'
    expect(() => validateGambit(illegal)).toThrow()
    expect(() => validateGambit({ ...original, side: original.side === 'white' ? 'black' : 'white' })).toThrow(/setup/)
    expect(() => validateGambit({ ...original, frequencies: {} })).toThrow(/frequencies/)
    expect(() => validateGambit({ ...original, lines: [...original.lines, original.lines[0]] })).toThrow(/duplicate/)
    const prefix = change()
    prefix.lines.push({ name: 'Too short', moves: [prefix.lines[0].moves[0]] })
    expect(() => validateGambit(prefix)).toThrow(/prefix/)
    const wrongCount = change()
    wrongCount.frequencies[positionKey(replay(original.setup))].total = 1
    expect(() => validateGambit(wrongCount)).toThrow(/exceed/)
    const illegalCount = change()
    illegalCount.frequencies[positionKey(replay(original.setup))].counts.a1a8 = 1
    expect(() => validateGambit(illegalCount)).toThrow(/illegal move in source/)
    expect(() => validateGambit({ ...original, source: { ...original.source, url: 'javascript:alert(1)' } })).toThrow()
  })
})

describe('weighted replies', () => {
  it('normalizes explorer king-to-rook castling without accepting illegal moves', () => {
    const position = replay([], 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1')
    expect(explorerUci(position, 'e8h8')).toBe('e8g8')
    expect(explorerUci(position, 'e8a8')).toBe('e8c8')
    expect(explorerUci(position, 'e8g8')).toBe('e8g8')
    expect(() => explorerUci(replay([]), 'e1h1')).toThrow(/illegal/)
  })
  const choices = [{ value: 'a', weight: 3 }, { value: 'b', weight: 7 }]
  it('uses proportional intervals including exact boundaries', () => {
    expect(weightedChoice(choices, () => 0)).toBe('a')
    expect(weightedChoice(choices, () => .29999)).toBe('a')
    expect(weightedChoice(choices, () => .3)).toBe('b')
    expect(weightedChoice(choices, () => .99999)).toBe('b')
    expect(weightedChoice(choices.slice(0, 1), () => .9)).toBe('a')
  })
  it('rejects invalid distributions and RNG values', () => {
    for (const weight of [0, -1, NaN, Infinity]) expect(() => weightedChoice([{ value: 'a', weight }])).toThrow()
    for (const random of [-.1, 1, NaN]) expect(() => weightedChoice(choices, () => random)).toThrow()
    expect(() => weightedChoice([])).toThrow()
  })
})

describe('book to engine transitions and undo', () => {
  const gambit = gambits.find((item) => item.id === 'kings-gambit')!
  const book = compileBook(gambit)
  it('hands off for a legal off-book move or a book leaf, not an accepted reply', () => {
    const game = replay(gambit.setup)
    expect(bookReply(gambit, book, game, () => 0)).toBe('e5f4')
    expect(cursorAt(book, ['e5f4'])?.children.size).toBeGreaterThan(0)
    expect(bookReply(gambit, cursorAt(book, ['e5f4', 'b1c3']), replay([...gambit.setup, 'exf4', 'Nc3']))).toBeUndefined()
    const path: string[] = []
    for (const move of gambit.lines[0].moves) path.push(uci(game.move(move)))
    expect(bookReply(gambit, cursorAt(book, path), game)).toBeUndefined()
  })
  it('undoes to the preceding human decision and restores its opening cursor', () => {
    const setup = setupMoves(gambit)
    const previous = [...setup, 'e5f4']
    expect(undoDecision(gambit, [...previous, 'b1c3'])).toEqual(previous)
    expect(undoDecision(gambit, [...previous, 'b1c3', 'b8c6'])).toEqual(previous)
    expect(cursorAt(book, undoDecision(gambit, [...previous, 'b1c3']).slice(setup.length))).toBeDefined()
    expect(undoDecision(gambit, setup)).toEqual(setup)
  })
  it('recognizes game-over conditions before requesting a computer move', () => {
    expect(gameResult(replay(['f3', 'e5', 'g4', 'Qh4#']))).toMatch(/Checkmate. Black/)
    expect(gameResult(replay([], '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toMatch(/stalemate/)
    expect(gameResult(replay([], '7k/8/6K1/8/8/8/8/8 w - - 0 1'))).toMatch(/insufficient/)
  })
})

describe('feedback from the player perspective', () => {
  it('normalizes engine scores and uses an inclusive 1.5 pawn threshold for both sides', () => {
    expect(whiteScore({ kind: 'cp', value: 80 }, 'b').value).toBe(-80)
    expect(moveFeedback({ kind: 'cp', value: 100 }, { kind: 'cp', value: -49 }, 'w')).toBeUndefined()
    expect(moveFeedback({ kind: 'cp', value: 100 }, { kind: 'cp', value: -50 }, 'w')).toMatch(/1.5/)
    expect(moveFeedback({ kind: 'cp', value: -100 }, { kind: 'cp', value: 50 }, 'b')).toMatch(/1.5/)
    expect(moveFeedback({ kind: 'cp', value: -100 }, { kind: 'cp', value: 50 }, 'w')).toBeUndefined()
  })
  it('handles entering a losing mate and losing a winning mate without warning on ongoing mate', () => {
    expect(moveFeedback({ kind: 'cp', value: 0 }, { kind: 'mate', value: -2 }, 'w')).toMatch(/allows/)
    expect(moveFeedback({ kind: 'mate', value: 3 }, { kind: 'cp', value: 500 }, 'w')).toMatch(/slipped/)
    expect(moveFeedback({ kind: 'mate', value: -4 }, { kind: 'mate', value: -2 }, 'w')).toBeUndefined()
    expect(moveFeedback({ kind: 'cp', value: 0 }, { kind: 'mate', value: 2 }, 'b')).toMatch(/allows/)
  })
})
