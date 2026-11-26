# Third-party notices

Gambit Lab is distributed under GPL-3.0-only. The original repository's MIT
copyright and permission notice is preserved in LICENSE-MIT.

## Stockfish.js 19.0.1

GPL-3.0, Copyright (c) 2026 Chess.com, LLC, and Stockfish contributors.
Based on Stockfish by Tord Romstad, Marco Costalba, Joona Kiiski, Gary
Linscott, and other contributors. WASM port maintained by Nathan Rugg.
Lite network by Chris Bao (sscg13). Full attribution is in the matching
source archive's AUTHORS and source headers.

https://github.com/nmrugg/stockfish.js

Matching source, required lite network, build instructions, and GPL text are
distributed alongside the engine. See the app footer for source downloads.

## chess.js 1.4.0

BSD-2-Clause, Copyright (c) 2025 Jeff Hlywa. The full license is distributed
in the dependency notices download.

https://github.com/jhlywa/chess.js

## react-chessboard

MIT, Copyright (c) 2022 Ryan Gregory. The full license is distributed in
the dependency notices download. The app renders the piece sets below rather
than redistributing the library's default piece artwork.

https://github.com/Clariity/react-chessboard

## Chess piece sets (via Lichess)

Unmodified SVGs vendored in `public/pieces/` from lichess-org/lila at commit
917efacbcc90f6147955a9d781266000a34d8fe6, as listed in lila's COPYING.md.
Both sets are licensed GPL-2.0-or-later and are used here under GPL-3.0,
whose full text ships with the app (LICENSE.txt).

- `cburnett`: by Colin M.L. Burnett. GPL-2.0-or-later.
  https://github.com/lichess-org/lila/tree/master/public/piece/cburnett
- `merida`: by Armando Hernandez Marroquin. GPL-2.0-or-later.
  https://github.com/lichess-org/lila/tree/master/public/piece/merida

The Lichess `california` set is licensed CC BY-NC-SA 4.0. Its non-commercial
term is incompatible with GPL-3.0, so it is not bundled.

## Other dependencies

React, React DOM, Zod, and bundled transitive runtime dependencies retain their
own permissive licenses. `npm run assets` gathers the installed dependency
license texts into THIRD-PARTY.txt; it fails if a runtime dependency has no
discoverable license file. Development dependencies are not shipped as runtime
code; their notices remain in their corresponding packages.

## Opening frequencies and original content

Weights are factual aggregates from the Lichess masters opening explorer,
retrieved on the date in each gambit JSON. Each position records its sample
size and move counts. This is a master-game sample, not a club-rating sample:
the public club-game endpoint was unavailable during authoring. Conditional
selection among included replies does not represent every human response.

https://github.com/lichess-org/lila-openingexplorer

All ideas/explanations in this repository are original. Move sequences and
frequency counts are factual chess data; no published annotations are copied.
