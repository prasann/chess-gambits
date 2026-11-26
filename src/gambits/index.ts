import { validateGambit } from '../domain/gambit'

const files = import.meta.glob('./*.json', { eager: true, import: 'default' })
export const gambits = Object.values(files).map((value) => validateGambit(value)).sort((a, b) =>
  b.side.localeCompare(a.side) || a.name.localeCompare(b.name),
)
