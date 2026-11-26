import { writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { gambitSchema } from '../src/domain/gambit.ts'

await writeFile('docs/gambit.schema.json', `${JSON.stringify(z.toJSONSchema(gambitSchema), null, 2)}\n`)
