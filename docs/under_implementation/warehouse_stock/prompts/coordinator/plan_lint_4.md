---
plan: 4
role: coordinator
round: "-"
date: 2026-09-01
---

# Pre-dispatch lint — `plans/plan_4_item_transition_hooks.md`

Gate: intention **RATIFIED**; P2 **APPROVED**. **Two defects found and folded, one systemic.**

| Property | Result |
|---|---|
| 1 — references | all four hook files present (`update-item-location.command.ts` 198 lines, `process-products-update-webhook.job.ts` 236, `handle-orders-paid` 227, `handle-orders-create` 250); `existingHistory` is loaded before the mutations; `syncProductSnapshotIfHistoryExists` at `:182` and `appendLocationEvent` at `:145`/`:201` — the plan's ordering claim holds; `findByShopAndProduct` exists; both orders commands call `appendSoldTerminalEventWithFallback` |
| 2 — counts | **7** criteria · **25** lettered rows (`C1 8 · C2 2 · C3 2 · C4 4 · C5 3 · C6 3 · C7 3` = 25 — **corrected 2026-09-01**, caught by the projection as its F6; the first pass printed 28 by counting label occurrences instead of distinct rows) · perimeter 5 files |
| 3 — addressable | **FAILED systemically, fixed (L1).** Only C1 had lettered rows; **C2 through C7 were each a single unlabelled sentence** carrying two or three distinct assertions. Six of seven criteria were unaddressable, so the verify/manual instruments had nothing to key a line to and a partial pass would have read as a full one. All six are now split, and the split names the case that discriminates in each — C4(c) the single `before` capture, C5(b) the replay short-circuit, C6(c) that a source refusal still permits the destination increment |
| 4 — exact outcomes | disjunction sweep → zero hits |
| 5 — traces | **FAILED, fixed (L2).** C7 (perimeter integrity) traced to `§0.10/§0.9` with no ledger id; now carries an explicit "no `M` id by design" note. Reverse: P4 claims M3, M4 — both served |

**Extra checks.** No perimeter-vs-guard collision. No deletion task. Standing instructions:
§3 (projection **mandatory** for P4 — honoured), §7 (gate = P2 APPROVED ✓), §9.1(d) ✓,
§9.6 (`scan-history.repository.ts` out of perimeter — now an explicit byte-identical row, C7(b)).

**Sixth check — citation drift.** Context §0.10 cites the `returnToStore` branch at
`update-item-location.command.ts:53-70`; it now opens at **:48**. The symbol resolves, the line
range does not. Task 2 now says to locate it **by symbol, not line**, and records the drift —
a line citation into a file the phase will itself edit is a reference that rots.

**Sizing.** 7 criteria, at target.

**Verdict: LINT PASS after two folds — plan 4 may proceed to projection.**
