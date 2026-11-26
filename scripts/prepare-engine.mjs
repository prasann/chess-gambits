import { createHash } from 'node:crypto'
import { access, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const directory = 'public/engine'
await mkdir(directory, { recursive: true })
const files = [
  ['stockfish-19-lite-single.js', 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a'],
  ['stockfish-19-lite-single.wasm', 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de'],
]
for (const [file, hash] of files) {
  const source = `node_modules/stockfish/bin/${file}`
  if (createHash('sha256').update(await readFile(source)).digest('hex') !== hash) {
    throw new Error(`Unexpected Stockfish artifact: ${file}`)
  }
  await copyFile(source, `${directory}/${file}`)
}

async function download(file, url, expected) {
  const destination = `${directory}/${file}`
  try {
    await access(destination)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Cannot download ${url}: ${response.status}`)
    await writeFile(destination, Buffer.from(await response.arrayBuffer()))
  }
  const hash = createHash('sha256').update(await readFile(destination)).digest('hex')
  if (!hash.startsWith(expected)) throw new Error(`Source checksum mismatch: ${file}`)
}

await download(
  'stockfish-source.tar.gz',
  'https://codeload.github.com/nmrugg/stockfish.js/tar.gz/refs/tags/v19.0.1',
  'a18aa8a871f5265014b110b3e07804ff3637899d2e189be6ded2b99e2c17a10e',
)
await download(
  'nn-61e7af4bb97d.nnue',
  'https://tests.stockfishchess.org/api/nn/nn-61e7af4bb97d.nnue',
  '61e7af4bb97d51eeeb25d322916f86513b5cd3a827ce189c98c6e31946f99e5b',
)
await copyFile('node_modules/stockfish/Copying.txt', `${directory}/COPYING.txt`)
await copyFile('docs/engine.md', `${directory}/BUILD.md`)
await copyFile('LICENSE', 'public/LICENSE.txt')
await copyFile('LICENSE-MIT', 'public/LICENSE-MIT.txt')
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
let notices = await readFile('docs/third-party.md', 'utf8')
for (const [path, metadata] of Object.entries(lock.packages)) {
  if (!path || metadata.dev || metadata.devOptional) continue
  const licenses = (await readdir(path)).filter((file) => /^(license|copying)(\.|$)/i.test(file))
  if (!licenses.length) throw new Error(`Missing runtime license: ${path}`)
  notices += `\n\n--- ${path} ${metadata.version} (${metadata.license ?? 'see text'}) ---\n`
  for (const license of licenses) notices += `\n${await readFile(`${path}/${license}`, 'utf8')}\n`
}
await writeFile('public/THIRD-PARTY.txt', notices)
execFileSync('tar', ['-czf', `${directory}/app-source.tar.gz`,
  'src', 'scripts', 'docs', 'tests', '.github', 'public/pieces', 'package.json', 'package-lock.json',
  'tsconfig.json', 'vite.config.ts', 'eslint.config.js', 'playwright.config.ts',
  'index.html', 'README.md', 'CONTRIBUTING.md', 'LICENSE', 'LICENSE-MIT', '.gitignore', '.npmrc',
])
console.log('Verified and staged Stockfish 19 lite-single, matching source, network, and licenses.')
