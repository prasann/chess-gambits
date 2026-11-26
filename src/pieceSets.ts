import { useSyncExternalStore } from 'react'

export const pieceSets = [
  { id: 'cburnett', label: 'Cburnett' },
  { id: 'merida', label: 'Merida' },
] as const
export type PieceSet = (typeof pieceSets)[number]['id']

const storageKey = 'gambitlab.pieceSet'
const listeners = new Set<() => void>()

function isPieceSet(value: unknown): value is PieceSet {
  return pieceSets.some((set) => set.id === value)
}

function read(): PieceSet {
  try {
    const stored = localStorage.getItem(storageKey)
    return isPieceSet(stored) ? stored : 'cburnett'
  } catch {
    return 'cburnett'
  }
}

let current = read()

export function setPieceSet(set: PieceSet) {
  current = set
  try { localStorage.setItem(storageKey, set) } catch { /* storage unavailable */ }
  listeners.forEach((listener) => listener())
}

export function usePieceSet() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, () => current)
}

export function pieceUrl(set: PieceSet, piece: string) {
  return `${import.meta.env.BASE_URL}pieces/${set}/${piece}.svg`
}
