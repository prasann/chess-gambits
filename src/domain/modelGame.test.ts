import { describe, expect, it } from 'vitest'
import { gambits } from '../gambits'
import { undoDecision, validateGambit } from './gambit'
import { moveLabel, parseModelGame, validateModelGames, type ModelGame } from './modelGame'

const kings = gambits.find((item) => item.id === 'kings-gambit')!
const games = () => structuredClone(kings.modelGames!)
const withGames = (modelGames: ModelGame[]) => ({ ...kings, modelGames })

describe('model games', () => {
  it('bundles one legal game of each kind with in-range moments for every gambit', () => {
    for (const gambit of gambits) {
      expect(gambit.modelGames?.map((game) => game.kind).sort()).toEqual(['defense-holds', 'gambit-works'])
      for (const game of gambit.modelGames!) {
        const total = parseModelGame(game).san.length
        expect(game.moments.every((moment) => moment.ply >= gambit.setup.length && moment.ply <= total)).toBe(true)
      }
    }
  })

  it('rejects wrong kind counts, broken setups, wrong results and bad moments', () => {
    const [works, holds] = games()
    expect(() => validateModelGames(withGames([works]))).toThrow(/exactly one/)
    expect(() => validateModelGames(withGames([works, { ...holds, kind: 'gambit-works' }]))).toThrow(/exactly one/)
    expect(() => validateModelGames(withGames([works, { ...holds, id: works.id }]))).toThrow(/duplicate/)
    expect(() => validateModelGames(withGames([{ ...works, moves: '1. e4 e5 2. Nf3 Nc6' }, holds]))).toThrow(/gambit setup/)
    expect(() => validateModelGames(withGames([{ ...works, moves: '1. e4 e5 2. f4' }, holds]))).toThrow(/continue past/)
    expect(() => validateModelGames(withGames([{ ...works, moves: '1. e4 e5 2. f4 Ke7 3. Kf8' }, holds]))).toThrow(/illegal move Kf8 at ply 5/)
    expect(() => validateModelGames(withGames([{ ...works, result: '1/2-1/2' }, holds]))).toThrow(/won by the gambit side/)
    expect(() => validateModelGames(withGames([works, { ...holds, result: '1-0' }]))).toThrow(/draw or a defender win/)
    const reversed = { ...works, moments: [...works.moments].reverse() }
    expect(() => validateModelGames(withGames([reversed, holds]))).toThrow(/ascending/)
    const early = { ...works, moments: [{ ...works.moments[0], ply: 2 }, ...works.moments.slice(1)] }
    expect(() => validateModelGames(withGames([early, holds]))).toThrow(/gambit offer/)
    const late = { ...works, moments: [...works.moments.slice(0, -1), { ...works.moments.at(-1)!, ply: 999 }] }
    expect(() => validateModelGames(withGames([late, holds]))).toThrow(/beyond the game/)
    const arrow = games()
    arrow[0].moments[0].arrows = [['e9', 'e4']] as never
    expect(() => validateGambit(withGames(arrow))).toThrow()
  })

  it('checks a terminal final position against the stated result', () => {
    const base = { ...games()[0], moments: [] }
    const mate = (result: ModelGame['result'], kind: ModelGame['kind'], id: string): ModelGame =>
      ({ ...base, id, kind, result, moves: '1. f3 e5 2. g4 Qh4#' })
    const gambit = { id: 'fixture', side: 'black' as const, setup: ['f3', 'e5', 'g4'] }
    expect(() => validateModelGames({ ...gambit, modelGames: [mate('0-1', 'gambit-works', 'a'), mate('1/2-1/2', 'defense-holds', 'b')] })).toThrow(/b: result does not match/)
    expect(() => validateModelGames({ ...gambit, modelGames: [mate('0-1', 'gambit-works', 'a'), { ...mate('1-0', 'defense-holds', 'b'), moves: '1. f3 e5 2. g4 d6' }] })).not.toThrow()
  })

  it('labels plies and never undoes past a practice-from-here floor', () => {
    expect(moveLabel(29, 'Bc4')).toBe('15.Bc4')
    expect(moveLabel(30, 'Nf6')).toBe('15…Nf6')
    const seed = parseModelGame(kings.modelGames![0]).uci.slice(0, 29)
    expect(undoDecision(kings, seed, 29)).toEqual(seed)
    const played = parseModelGame(kings.modelGames![0]).uci.slice(0, 32)
    expect(undoDecision(kings, played, 29)).toEqual(played.slice(0, 30))
    expect(undoDecision(kings, played.slice(0, 31), 29)).toEqual(played.slice(0, 30))
    expect(undoDecision(kings, played.slice(0, 30), 29)).toEqual(seed)
  })
})
