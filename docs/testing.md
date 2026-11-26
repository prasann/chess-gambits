# Test guide

`npm test` checks all bundled content, book traversal, weighted boundaries,
off-book/leaf handoff, undo, feedback perspective/thresholds/mates, and UCI
readiness, strength, cancellation, stale replies, failure/retry, and score quality.

`npm run build && npm run test:browser` serves the production build at the real
repository subpath. Playwright runs desktop, iPhone-sized, and Pixel-sized
Chromium contexts with touch where applicable. These are viewport/input
emulations, not claims that Safari, Android hardware, or a real iPhone was tested.
A visual-contrast regression checks that both piece silhouettes remain distinct
from both square colors in light and dark themes, without reversing side colors.
A separate Vite-served board fixture exercises promotion and keyboard input;
it is not part of the production site.

## Real-phone acceptance check

This requires a person with a physical phone; mark it outstanding until done.

1. On the same trusted Wi-Fi, run `npm run dev`. Open the printed Network URL
   plus `/chess-gambits/` on a 360-430px-class phone.
2. Read a detail page and try both White and Black. Tap pieces/destinations;
   verify all controls remain reachable and text is legible without zooming.
3. Leave the book and wait for Stockfish. Observe startup/thinking feedback
   and whether the page stays responsive. Try all strengths.
4. Expand/collapse ideas and history. Undo/restart, rotate to landscape, and
   check safe areas and absence of horizontal scrolling.
5. Background the tab while the engine is thinking, return, and confirm only
   the current position advances. Leave practice and confirm work stops.
6. Exercise a promotion using the local-only fixture at
   `/chess-gambits/tests/board.html`; verify the picker and page gestures.

Record device/browser, startup/move responsiveness, and problems in the review.
Do not substitute desktop CPU measurements for mid-range-phone performance.
