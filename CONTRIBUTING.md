# Contributing

Prefer a small, well-explained repertoire over many unreviewed lines.

## Add or revise a gambit

1. Copy an existing file in `src/gambits/` to a new stable kebab-case name.
   The file name must match `id`. Use schema version 1 and no extra fields.
2. Write original explanations for idea, structure, pieces, motifs, declined,
   and caution. Explain plans rather than listing best moves. Do not copy
   annotations or imply a speculative sacrifice forces a win.
3. Give legal SAN `setup` moves from the standard starting position, ending
   immediately after the gambit side offers the pawn. Add named `lines` after
   that position: accepted main line, accepted alternative, and common declines.
   The first line is the main line; keep principal paths about 8-12 plies.
4. Reset `frequencies` to `{}` when changing positions or the source. Run:

   ```sh
   npm run source:weights -- your-gambit-id
   npm run validate
   npm test
   npm run typecheck
   ```

   The sourcing tool fetches the public Lichess **masters** explorer and records
   per-position observed counts. It retries one rate-limit response after a
   pause, preserves progress, and fails explicitly for unavailable/unobserved
   moves. Do not fabricate counts to make validation pass. Inspect the error,
   choose a documented real continuation, and refresh. Source totals can differ
   along a path because the explorer recognizes transpositions.
5. Replay every branch, check both sides' plans and any concrete trap, and
   practice on a phone. An LLM can draft a file; validation establishes shape,
   legality, and available counts, **not** strategic truth. Have a human review
   the content before treating it as authoritative.

The app discovers JSON files automatically; no route, registry, or controller
edits are needed. See [the format reference](docs/gambit-format.md).

## Useful LLM authoring brief

> Draft one schema-v1 gambit JSON matching docs/gambit.schema.json. Use original,
> sober conceptual explanations. End setup at the player's gambit offer. Include
> a named accepted main line, accepted alternative, and common declined branches
> in SAN. Keep frequencies empty; do not invent statistics or citations. Keep
> source set to the documented masters explorer. Explain uncertainties for human
> review. Run source:weights, validate, and tests; fix reported issues rather than
> weakening validation.

## Development

Run the commands in README. Keep pure chess logic outside React. Do not bypass
chess.js legal-move checks. Inject randomness in selection tests instead of
writing probabilistic assertions. Engine changes need lifecycle/cancellation
coverage and a real worker smoke test. UI changes need phone touch checks.

For schema changes, update the runtime Zod schema, increment its version when
breaking, run `npm run schema`, and update the docs/data together. Do not weaken
validation just to accept an invalid generated file.

## Licensing

Contributions to the combined project are GPL-3.0-only. Preserve existing
copyright notices. New code/content must be yours or carry a compatible license.
Do not introduce a binary, piece set, neural network, or dependency without its
required license, attribution, and corresponding-source materials. Engine
updates must update pinned checksums/source/network together.
