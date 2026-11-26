# Stockfish distribution and build

The app ships Stockfish.js **19.0.1**, lite single-threaded, unmodified, from
the pinned npm package. It runs in a worker without cross-origin-isolation
headers. Its approximately 1.8 MB WASM contains the lite neural network.

`npm run assets` checks the JS/WASM SHA-256 digests, downloads and verifies
the matching source archive and network, and stages everything in
`public/engine/`. `npm run build` includes those files in `dist/engine/`.
No CDN or opening service is contacted during play. The first build needs
network access; subsequent builds reuse verified source/network downloads.

## Matching source

- Source: https://github.com/nmrugg/stockfish.js/tree/v19.0.1
- Archive: `stockfish-source.tar.gz` in this directory when deployed.
- Neural network: `nn-61e7af4bb97d.nnue` in this directory when deployed.
- GPL: `COPYING.txt`; upstream copyright and authorship are in the source.
- No local engine modifications or patches.

Rebuild with the upstream toolchain (Emscripten 6.0.9, Node.js, make, and
a C++ toolchain):

```sh
tar -xzf stockfish-source.tar.gz
cp nn-61e7af4bb97d.nnue stockfish.js-19.0.1/src/
cd stockfish.js-19.0.1
npm install
node build.js --single-threaded --lite --strict-em-check
```

The archive includes upstream build scripts and engine sources. The separately
provided network is the exact embedded input, not a different contemporary
network. Generated binaries can contain toolchain-dependent differences.
See the upstream README and build script for the full options and compiler
installation. The complete app source is provided as `app-source.tar.gz`.

Digests and immutable upstream input URLs are recorded in
`scripts/prepare-engine.mjs`. Never update the npm version without also updating
and verifying the matching source, network, checksums, and notices.

## Runtime policy

Relaxed, Club challenge, and Challenging map to Skill Level 0, 5, and 12,
with 250, 450, and 700 ms move budgets. These are not Elo estimates.
Feedback uses Skill Level 20 with a 350 ms budget per position and requires
at least depth 8 with an exact (not bound-only) score. Analysis is shallow
and approximate, not a verdict on the opening's theoretical soundness.

Searches are serialized. Cancellation terminates the worker (after sending
`stop`), so output from an abandoned search cannot contaminate its successor.
Hiding the tab stops engine work; returning resumes the valid current position.
The adapter exposes initialization, worker, and search errors to the UI.
