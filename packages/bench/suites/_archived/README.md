# Archived suites — OUTDATED, do not use

## pll-v1

The first PLL suite. Superseded on 2026-06-18 and **not comparable** to the
current `suites/pll`. Two reasons it was regenerated from scratch:

1. **Algorithms retuned.** The PLL algorithms were rewritten so that each
   inverse produces an intuitive, recognizable "base case" presentation
   (blocks aligned, a good view of the case on the F/R faces). Earlier
   algorithms produced AUF-offset base cases that didn't match the textbook
   diagrams.
2. **Variant scheme changed.** v1 used random pre-AUF + y-rotation variants
   (4 cases per PLL, deduped). The current suite drops AUF entirely and uses
   the 4 fixed y-views (base, y, y2, y') — testing recognition across viewing
   angles, the axis that actually carries signal.

Kept for reference only. Any run scored against this suite has a different
`suiteHash` than the current suite, so the harness already treats them as
incomparable.
