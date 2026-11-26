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

## Invariants checked automatically

Strict shape/version; file/id uniqueness; correct side at the offer; every
setup/branch move legal; no duplicate/prefix paths; positive finite weights;
complete computer-node counts; counts consistent with total. Content errors
fail the build rather than being silently hidden.

## Human review

Confirm that the setup genuinely offers the intended gambit, branches cover
its common accepts/declines, explanations match the resulting structures, and
any named trap actually works under its stated conditions. Legal moves are not
a proof of theoretical quality.
