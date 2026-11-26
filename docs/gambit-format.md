# Gambit format (schema version 1)

The generated [JSON Schema](gambit.schema.json) mirrors
`src/domain/gambit.ts`. Run `npm run schema` after schema changes.

One JSON file is one gambit, automatically discovered by Vite. Required fields:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Exactly `1` |
| `id`, `name` | Stable kebab-case slug and displayed title |
| `side` | `white` or `black`; the human always plays this side |
| `subtitle`, `character` | Short summary and practical style |
| `ideas` | Nonempty `idea`, `structure`, `pieces`, `motifs`, `declined`, `caution` |
| `setup` | SAN moves from start, ending with the human side's offer |
| `lines` | At least three `{ name, moves }` objects; SAN after setup |
| `source` | Name, HTTPS endpoint, retrieval date, and sampling caveat |
| `frequencies` | Position-keyed source totals and observed UCI move counts |
| `modelGames` | Optional. Exactly two annotated master games; see below |

## Authorable paths, runtime tree

`lines` stores readable paths instead of deeply nested JSON. The first path is
the main line. The compiler merges their shared prefixes into the hardcoded
move tree and converts SAN to UCI using chess.js. This keeps LLM/human authoring
simple without duplicating branch logic. Duplicate paths and paths ending
inside another path are rejected.

For example, the King's Gambit setup is `["e4", "e5", "f4"]`. One continuation
starts `["exf4", "Nf3", "g5"]`, another `["exf4", "Nf3", "d6"]`; their shared
prefix becomes one node. Neither the ideas panel nor the app reveals the tree
as a list of answers.

A position key is the first four fields of chess.js FEN: placement, active
side, castling rights, and en-passant target. Halfmove/fullmove counters do not
change opening probabilities. Each frequency entry looks like:

```json
{
  "total": 100,
  "counts": { "e5f4": 70, "d7d5": 20, "f8c5": 10 }
}
```

The numbers above are **illustrative only**, not sourced opening statistics.
Use `npm run source:weights -- kings-gambit` to fetch actual data.

The source query is exactly:

```text
{source.url}?play={full-comma-separated-UCI-path}&moves=50&topGames=0
```

The setup and named path reconstruct each query. Counts equal white wins plus
draws plus black wins. Each computer node requires positive observed counts for
all included replies; all stored counts are positive integers and their sum
cannot exceed the recorded total.

The explorer's king-to-rook castling encoding is normalized to standard UCI
king destinations (for example `e8h8` becomes `e8g8`) before storing counts.
All stored frequency moves, including replies outside the curated repertoire,
are checked for legality in their indexed position.

At computer nodes, normalize counts **only across included children**. A move
may therefore occur more often in practice than in the source database. Counts
are not an Elo model. Current files use master games, sometimes small deeper
samples; the application does not claim club-game representativeness.

Source refresh is an explicit authoring operation, never a runtime dependency.
Clear stale frequencies before changing positions/source. Commit refreshed
counts with the explanation of any repertoire change.

## Model games

`modelGames` holds one `gambit-works` game, won by the gambit side, and one
`defense-holds` game, which the defender won or drew. Both must be real games.
Pick a classical game when a good one exists. Mark rapid or blitz games in
`timeControl`, and the viewer labels them.

```json
{
  "id": "kasparov-anand-1995",
  "kind": "gambit-works",
  "white": "Garry Kasparov", "black": "Viswanathan Anand",
  "event": "Tal Memorial", "site": "Riga", "year": 1995,
  "timeControl": "classical", "result": "1-0",
  "moves": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 ...",
  "source": { "name": "Lichess masters database", "url": "https://lichess.org/rCR5rWCS", "retrievedAt": "2025-01-01" },
  "summary": "Up to 400 characters: why this game shows the gambit's idea.",
  "moments": [
    { "ply": 29, "title": "No castling allowed", "note": "Up to 280 characters.",
      "idea": "pieces", "arrows": [["h6", "f8"]], "highlights": ["e8"] }
  ]
}
```

- `moves` is SAN movetext, copied from the source PGN. Comments, variations
  and NAGs are removed during parsing.
- The game must start with `setup` and continue past it.
- `ply` counts half-moves from the start, so 29 is White's 15th move. The
  board shows the position after that ply.
- A game needs 4–6 moments in ascending order, starting at or after the
  gambit offer.
- `idea` links the moment to one of the gambit's idea cards. You can add up
  to 3 arrows (add `"red"` as a third element for a threat) and up to 4
  highlighted squares.
- Each moment's "Practice from here" link opens
  `#/practice/<id>?game=<game-id>&ply=<n>`. Practice then starts from the
  game position with Stockfish only and no opening book. Undo never goes
  before that position.

Choosing the games:

- The defense-holds game should show a principled defence: the defender
  keeps or returns the pawn and wins or draws on the merits. Do not pick a
  game where the gambit side simply blundered.
- Check each moment with an engine, so the note never praises a move that
  objectively drops the advantage.
- Moves and results are facts. Notes and summaries must be original; do not
  copy published annotations.

## Invariants checked automatically

Strict shape/version; file/id uniqueness; correct side at the offer; every
setup/branch move legal; no duplicate/prefix paths; positive finite weights;
complete computer-node counts; counts consistent with total. For model
games: one game of each kind, unique ids, legal movetext that starts with the
setup, a result that fits the kind and any mate or stalemate on the board,
and moment plies in range and ascending. Content errors
fail the build rather than being silently hidden.

## Human review

Confirm that the setup genuinely offers the intended gambit, branches cover
its common accepts/declines, explanations match the resulting structures, and
any named trap actually works under its stated conditions. Legal moves are not
a proof of theoretical quality.
