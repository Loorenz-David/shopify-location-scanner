---
plan: 3
role: coordinator
round: "-"
date: 2026-09-01
---

# Pre-dispatch lint — `plans/plan_3_configuration_api.md`

Gate: intention **RATIFIED**; P2 **APPROVED**. Three defects found and folded.

| Property | Result |
|---|---|
| 1 — references | zones module present (24 files), `getRequiredIdParam` at `zones.controller.ts:17`, `server.ts` carries 13 `/api/` mounts, P2 exports `reconcileGroup`/`reconcileAllGroups`. All resolve |
| 2 — counts | **7** criteria · **28** lettered rows (`C1 9 · C2 3 · C3 2 · C4 3 · C5 4 · C6 3 · C7 4` = 28 — **corrected 2026-09-01**; the first pass printed 31 by counting label *occurrences* rather than distinct rows, so a row id mentioned twice in one cell was double-counted) · perimeter 9 new files + `server.ts` |
| 3 — addressable | **FAILED, fixed (L1, L2).** C1 carried a non-standard `(b2)` label — introduced by this coordinator when folding P1 review N2 — which breaks both the lettering convention and the one-line-per-row count; it is now `(i)`, and C1's header was widened because the row is an **accept** case sitting under a header that said "rejects with 400". C3 had **no lettered rows at all**; now (a) quantity = the live-derived sum, (b) its state per §3's bands |
| 4 — exact outcomes | disjunction sweep → zero hits. C3(a) now forbids a typed literal and names the `sqlite3` command that derives the expected sum |
| 5 — traces | **FAILED, fixed (L3).** C7 (mounting + auth) traced to `§0.18/§0.3` with no ledger id. It measures transport and authorization, which the ledger does not cover, so it now carries an explicit **"no `M` id by design"** note citing the P2 C7 precedent rather than borrowing coverage. Reverse: P3 claims M1, M5, M6, M7(partial) — each served |

**Extra checks.** No perimeter-vs-guard collision (still zero occurrence/absence assertions in
`src`). No deletion task. Standing instructions naming plan 3: §7 (gate = P2 APPROVED ✓), §9.1(d)
(`verify-all` in phase-close ✓), P1 review N2 (folded — C1(i)), P2 review S2 (folded — C5(d)).

**Sizing.** 7 criteria, at target.

**Verdict: LINT PASS after three folds — plan 3 may proceed to projection.** The owner elected a
projection for P3 even though master plan §3 makes it waivable here; no waiver line is needed.
