---
plan: 3
role: implementer
state: IMPLEMENTED
verdict: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

# Plan 3 implementation handoff — round 1

The configuration domain is implemented and ready for the next phase. It now builds the
exact property criteria payload the wizard needs, displays backend-normalized values in the
vocabulary’s casing, and keeps the wildcard distinct from an omitted property. Threshold edits
stay valid through lowering, raising, clamping, and invalid typed input, and the five display
bands carry their state colors and numeric bounds. The implementation is committed in
checkpoints `2e8ad5c` and `4b64c46`; the coordinator still owns the tracker transition.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

## Coverage map

Each acceptance row is mapped below. “Exact” means the test assertion has the shape stated by
the row; the mutation rows cite the exact assertion that must redden under the named defect.

| criterion row | test id | assertion shape |
|---|---|---|
| C1(a) selected values | `C1(a): selected values always build as a display-cased array` | Exact: object value is an array and equals `Teak/Oak`, never a scalar. |
| C1(b) Any value | `C1(b): Any value builds the wildcard null value` | Exact: key is present with `null`. |
| C1(c) removed row | `C1(c): a removed property row leaves its key absent` | Exact absence assertion: an omitted row cannot create the key. |
| C1(d) catch-all | `C1(d): an empty property draft builds catch-all criteria` | Exact: output is `{}`. |
| C2(a) display casing | `C2: display casing round-trips wire values and preserves the wildcard chip` | Exact: lowercase wire `teak` is looked up as `Teak` and appears as a chip. |
| C2(b) normalized round-trip | same `C2` test | Exact: rendered display state rebuilds, then lower-casing yields the wire criteria. |
| C2(c) wildcard survives | same `C2` test | Exact literal assertion: `UPHOLSTERY · any`; rebuilt value is `null`. |
| C3 raw fallback | `C3: an unknown wire value is rendered raw without throwing` | Exact: unmatched `mystery` is returned unchanged. |
| C4 key order | `C4: chips follow vocabulary order and include universal-only keys` | Exact ordered result from the four universal keys, despite insertion order. |
| C5(a) lower normal | `C5(a): committing normal produces the exact threshold triple` | Exact triple `5/13/14`. |
| C5(b) lower normal below floor | `C5(b): committing normal produces the exact threshold triple` | Exact triple `1/2/3`. |
| C5(c) lower medium | `C5(c): committing medium produces the exact threshold triple` | Exact triple `4/5/39`. |
| C5(d) raise low to medium | `C5(d): committing low produces the exact threshold triple` | Exact triple `15/16/39`. |
| C5(e) raise low through normal | `C5(e): committing low produces the exact threshold triple` | Exact triple `39/40/41`. |
| C5(f) raise medium | `C5(f): committing medium produces the exact threshold triple` | Exact triple `5/39/40`. |
| C5(g) non-numeric | `C5(g): typed non-numeric values leave the draft unchanged` | Exact unchanged values for text and empty input, plus new-object assertion. |
| C5(h) low floor | `C5(h): committing low produces the exact threshold triple` | Exact triple `1/15/39`. |
| C6 invariant | `C6: 200 deterministic random commits preserve a strict valid ladder` | Exact invariant check after every one of 200 generated commits. |
| C6 raising mutation | `C5(e): committing low produces the exact threshold triple` | Exact biting assertion for deletion of `medium = max(...)`. |
| C6 lowering mutation | `C5(a): committing normal produces the exact threshold triple` | Exact biting assertion for deletion of the lowering branch. |
| C7 fixture 5/15/39 | `C7 fixture 5/15/39: labels and colors cover every quantity without gaps or overlap` | Exact labels, state metadata colors, and membership scan through `44`. |
| C7 fixture 1/2/3 | `C7 minimal fixture 1/2/3: labels and colors cover every quantity without gaps or overlap` | Exact labels, state metadata colors, and membership scan through `8`. |

Reverse map: the seven criteria tests are the seven criteria-domain tests; the eight exact
C5 cases are the seven parameterized cases plus the dedicated C5(g) test; C6 and the two C7
fixture cases are the remaining three threshold-domain tests. All 18 tests in the two phase
test files therefore map to a criterion row; there are no orphan tests.

The phase-wide purity clause is verified by source inspection: both production modules are
pure and contain no fetch, store, or environment access. The immutable-draft note is covered
by the `not.toBe(startingDraft)` assertions in every threshold case, including invalid input.
The universal-only category hazard is covered by C4’s four-key vocabulary case. The two
wildcard surfaces are intentionally not harmonized: this phase asserts only the wizard chip;
the entry-detail label belongs to P2.

## Mutation ledger

Declared mutation count is 2, from C6: executed 2, restored 2. The first early run using the
unescaped selector `C5(e)` skipped all 11 cases because Vitest treated the parentheses as a
regular expression; it was not counted as evidence. The corrected literal selectors below
were used for the final-tree reruns.

1. **Raising cascade — definition site.** In
   `src/features/stock/domain/stock-thresholds.domain.ts:61`, inside the `commitThreshold`
   definition, delete `next.medium = Math.max(next.medium, next.low + 1)`. Command:
   `./node_modules/.bin/vitest run src/features/stock/domain/stock-thresholds.domain.test.ts -t 'C5\(e\)'`.
   Observed red: `C5(e)` failed, 1 failed / 10 skipped; expected `{ low: 39, medium: 40,
   normal: 41 }`, received `{ low: 39, medium: 15, normal: 39 }`. The source was restored;
   the same command then passed 1 / 11 with 10 skipped.

2. **Lowering cascade — definition site.** In
   `src/features/stock/domain/stock-thresholds.domain.ts:57-59`, inside the
   `commitThreshold` definition, delete the lowering `if` branch. Command:
   `./node_modules/.bin/vitest run src/features/stock/domain/stock-thresholds.domain.test.ts -t 'C5\(a\)'`.
   Observed red: `C5(a)` failed, 1 failed / 10 skipped; expected `{ low: 5, medium: 13,
   normal: 14 }`, received `{ low: 5, medium: 15, normal: 14 }`. The source was restored;
   the same command then passed 1 / 11 with 10 skipped.

Both mutation probes were rerun after the threshold test file changed for the typecheck fix and
immutability assertions. Mutation-probe file list, separate from the implementation change
list: `src/features/stock/domain/stock-thresholds.domain.ts` (applied and reverted for both;
no mutant remains).

## Verification

- Pre-edit baseline after adding the executable cases but before production edits: the
  targeted collection run recorded 2 failed suites (the two absent domain modules) and 0
  executed test IDs. The pre-existing stock suite was 3 files / 32 tests passing.
- Targeted phase run: 2 files / 18 tests passing.
- Domain-scope run: `./node_modules/.bin/vitest run src/features/stock` — 5 files / 50 tests
  passing.
- Closing L4 stamp on clean checkpoint `4b64c46`: `npm test` — 5 files / 50 tests passing;
  `npm run typecheck` — passed with no diagnostics; `npm run lint` — 48 errors / 14 warnings
  (62 problems), unchanged from the documented repository baseline, all outside the phase.
  Scoped lint over all four phase files — 0 errors / 0 warnings. The first L4 attempt exposed
  one test-only TS2556 spread error; it was fixed within the phase perimeter and checkpointed
  as `4b64c46` before the successful stamp.
- Tree identity for the successful stamp: checkpoint `4b64c46`, asserted clean. The handoff
  and final plan-log additions are documentation-only changes after that code checkpoint;
  no production or test source changed after the successful stamp.

## Full write perimeter

Implementation files created:

- `apps/frontend/src/features/stock/domain/stock-criteria.domain.ts`
- `apps/frontend/src/features/stock/domain/stock-criteria.domain.test.ts`
- `apps/frontend/src/features/stock/domain/stock-thresholds.domain.ts`
- `apps/frontend/src/features/stock/domain/stock-thresholds.domain.test.ts`

Required documentation files written:

- `apps/frontend/docs/under_development/stock_locations/plans/plan_3_config_domain.md` —
  implementation Review log entry.
- `apps/frontend/docs/under_development/stock_locations/handoffs/implementer/handoff_plan_3_implement_1.md` —
  this handoff.

No view types were needed. No fixture, P1 source, API, store, controller, flow, UI, sibling
worktree, or architecture-graph state was changed. No archgraph exists in this repository.
The coordinator must advance only P3’s tracker row; no tracker row was edited here.

## Findings not changed

- The first scoped `npx eslint` invocation hit a pre-existing root-owned npm-cache permission
  error. The identical scoped lint check passed through the local `eslint` binary; this did
  not affect repository source or dependency state.
- Repository lint remains at the recorded 48 errors / 14 warnings baseline. The phase files
  themselves have no lint findings, so unrelated lint cleanup was intentionally not performed.
- The initial successful test run preceded the test-only typecheck correction; the replacement
  checkpoint and final stamp are the evidence for the delivered tree.
