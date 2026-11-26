import { readdir, readFile, writeFile } from 'node:fs/promises'
import { compileBook, explorerUci, playerColor, positionKey, replay, setupMoves, validateGambit, type BookNode } from '../src/domain/gambit.ts'
import type { Chess } from 'chess.js'
import { z } from 'zod'

const responseSchema = z.object({
  white: z.number(), draws: z.number(), black: z.number(),
  moves: z.array(z.object({ uci: z.string(), white: z.number(), draws: z.number(), black: z.number() })),
})
const selected = process.argv[2]
const files = (await readdir('src/gambits')).filter((name) => name.endsWith('.json') && (!selected || name === `${selected}.json`))
if (!files.length) throw new Error(`No gambit files matched ${selected ?? 'src/gambits'}`)
for (const file of files) {
  const path = `src/gambits/${file}`
  const gambit = validateGambit(JSON.parse(await readFile(path, 'utf8')), false)
  const walk = async (node: BookNode, game: Chess, moves: string[]) => {
    if (node.children.size && game.turn() !== playerColor(gambit)) {
      const key = positionKey(game)
      if (!gambit.frequencies[key]) {
        const url = `${gambit.source.url}?play=${moves.join(',')}&moves=50&topGames=0`
        let response = await fetch(url)
        if (response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 60000))
          response = await fetch(url)
        }
        if (!response.ok) throw new Error(`${file}: explorer returned ${response.status}: ${url}`)
        const data = responseSchema.parse(await response.json())
        gambit.frequencies[key] = {
          total: data.white + data.draws + data.black,
          counts: Object.fromEntries(data.moves.map((move) => [explorerUci(game, move.uci), move.white + move.draws + move.black]).filter(([, count]) => Number(count) > 0)),
        }
        await writeFile(path, `${JSON.stringify(gambit, null, 2)}\n`)
        console.log(`${gambit.id}: ${moves.length} plies, ${gambit.frequencies[key].total} games`)
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }
    for (const [move, child] of node.children) {
      game.move(move)
      await walk(child, game, [...moves, move])
      game.undo()
    }
  }
  await walk(compileBook(gambit), replay(gambit.setup), setupMoves(gambit))
  gambit.source.retrievedAt = new Date().toISOString().slice(0, 10)
  validateGambit(gambit)
  await writeFile(path, `${JSON.stringify(gambit, null, 2)}\n`)
}
