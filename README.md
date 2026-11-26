# Gambit Lab

**Understand the sacrifice. Practice the position.**

A static, open-source chess gambit trainer for desktop and mobile. Read the
ideas, then play the gambit side against frequency-weighted opening replies.
When play leaves the repertoire, browser Stockfish takes over.

## Run locally

Requires Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/chess-gambits/**. The first run downloads the
matching Stockfish source/network for GPL compliance. The engine and all
opening data are subsequently served locally. No backend, account, API key,
runtime opening service, or external CDN is needed.

```sh
npm run validate       # all gambit shapes, legal lines, counts, and setup sides
npm test               # domain and UCI lifecycle tests
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:browser   # production build must already exist
npm run preview       # http://localhost:4173/chess-gambits/
```

To host at another subpath, build with `BASE_PATH=/your-path/ npm run build`.
The browser tests intentionally use the default repository subpath.

## Five repertoires

| White | Black |
| --- | --- |
| King's Gambit | Benko Gambit |
| Evans Gambit | Albin Countergambit |
| Smith-Morra Gambit | |

Each repertoire includes accepted and declined ideas and original explanations
of plans, pawn structures, piece placement, motifs, and practical cautions.
Practice starts just after the gambit offer, with an optional setup replay.
Each gambit also has two annotated master games: one where the gambit works and
one where the defence holds. Step through the key moments, then tap **Practice
from here** to play on from that position against Stockfish.
The side you chose is always yours; the opponent can accept or decline.

Tap a piece and then its destination on phones. Mouse dragging and keyboard
square selection are also supported. Controls sit below the board; ideas and
move history expand separately. Searches stop while the tab is hidden.

The Sunset theme pairs a warm parchment and charcoal board with wood tones,
in light and dark variants. Choose the Lichess cburnett or merida pieces from
the header.

### Honest limits

- Reply weights come from **Lichess master games**, not a club-rating sample.
  Selection is conditional on the curated branches, not every possible move.
  Some deeper positions have small samples. Exact counts/provenance are bundled.
- The lines are a compact repertoire, not an exhaustive theoretical survey.
  Every line is checked for legality. Ideas are original, but neither a legal
  line nor an engine check replaces expert chess review. Club feedback is welcome.
- Feedback is a short, unrestricted-strength evaluation comparison after book
  exit, not a deep coach's diagnosis. A loss of at least 1.5 pawns or a new/lost
  mating sequence produces a warning; insufficient analysis is reported.
- Strength presets are Skill Levels, **not calibrated Elo ratings**.
- No service worker: playing needs no remote service after assets load, but
  offline reopening is not guaranteed.
- Phone emulation does not replace checking touch feel/performance on a real
  device. See [the test guide](docs/testing.md).

## Add a gambit, including with an LLM

See [CONTRIBUTING](CONTRIBUTING.md) and [the data format](docs/gambit-format.md).
Add one JSON file, source its counts, and run validation. Discovery is automatic;
there is no route/registry to edit. Generated content must pass the same checks
and chess review as human-authored contributions.

## Deploy to GitHub Pages

The included Actions workflow checks the app, runs desktop/phone Chromium
tests, and uploads a static site from the default branch. In repository
**Settings > Pages**, choose **GitHub Actions** as the source, then run the
workflow or push an approved change to `main`. PRs run checks without deploying.
No deployment has been initiated as part of local implementation.

## Architecture and licenses

React/TypeScript/Vite, chess.js, react-chessboard, Zod, and a single-threaded
Stockfish.js 19 lite WASM worker. Pure book/game logic lives in `src/domain`;
the UCI adapter is isolated in `src/engine`. No backend or global-state framework.

The combined app is **GPL-3.0-only**, compatible with bundled Stockfish.
The original repository's MIT notice remains in [LICENSE-MIT](LICENSE-MIT).
Engine source, the required matching network, build instructions, app source,
and third-party license texts are included in every production build and linked
from the footer. See [engine packaging](docs/engine.md) and
[third-party notices](docs/third-party.md).
