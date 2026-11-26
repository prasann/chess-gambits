import { readdir, readFile } from 'node:fs/promises'
import { validateGambit } from '../src/domain/gambit.ts'

const files = (await readdir('src/gambits')).filter((name) => name.endsWith('.json'))
if (!files.length) throw new Error('No gambits found')
const ids = new Set<string>()
for (const file of files) {
  const gambit = validateGambit(JSON.parse(await readFile(`src/gambits/${file}`, 'utf8')))
  if (file !== `${gambit.id}.json` || ids.has(gambit.id)) throw new Error(`Duplicate or mismatched id: ${file}`)
  ids.add(gambit.id)
  console.log(`Valid: ${gambit.name} (${gambit.lines.length} branches)`)
}
