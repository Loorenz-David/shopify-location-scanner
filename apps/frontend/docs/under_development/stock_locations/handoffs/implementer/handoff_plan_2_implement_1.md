---
plan: 2
role: implementer
round: 1
state: IMPLEMENTED
verdict: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

The report logic is built and ready for the next phase. It keeps low stock in one location separate from healthy stock in another, supports both compacted and location-grouped views, and applies the selected filters to the numbers users see. The detail data also keeps each location's quantity and restores display casing from the existing options vocabulary. The required tests pass, and the only lint findings are the repository's documented pre-existing findings.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

## What was built

- Added the pure report domain in `src/features/stock/domain/stock-report.domain.ts`:
  compaction, properties comparison rendering, compact and grouped comparators, filtering, group ranking, report-view composition, pending-row counts, counter tiles, and entry-detail derivation.
- Extended `CompactedReportRow` with sorted per-location `contributions`, and added the returned report-view, counter-tile, and entry-detail view types.
- Added `countByStateBucket` to the existing state domain and one direct test for its four structural buckets.
- Added 31 report-domain tests. The existing `stock-allowlist.test.ts` was not changed; its state-name/hex guard and defect probes remain the C9 evidence.

## Coverage map — one line per criterion row

- C1(a) → `C1(a): compacts same-key same-state entries and retains sorted contributions` → strong: asserts summed quantity, code-point location rendering, source quantities, contribution order, and duplicate-location deduplication.
- C1(b) → `C1(b): preserves quantity totals independently for every state` → strong: computes before/after totals for each state on a mixed fixture.
- C1(c) → `C1(c): emits no duplicate mergeKey and state pair` → strong: compares the complete output pair set with its cardinality.
- C1(d) → `C1(d): leaves a single-entry group unchanged apart from wrappers` → strong: asserts every source field plus the two wrappers.
- C2 → `C2: keeps same-key entries in different states as separate rows` → strong: requires two rows with quantities 2 and 18 and the two states.
- C3(a) → `C3(a): orders state before quantity` → strong: the pair differs at the named first level.
- C3(b) → `C3(b): orders quantity ascending after equal state` → strong: the pair is equal at state and differs only at quantity.
- C3(c) → `C3(c): orders category case-insensitively by code point` → strong: the pair is equal through state and quantity and differs at category.
- C3(d) → `C3(d): orders the canonical properties string` → strong: asserts key order, returned value order, control separators, wildcard token, unknown-key ordering, and comparator ordering.
- C3(e) → `C3(e): orders the joined location list and returns zero only for identical rows` → strong: differs only at location, asserts identical rows compare zero, and proves a distinct merge key does not compare zero.
- C4(a) → `C4(a): ranks groups by out-of-stock count descending` → strong: compares 3 against 1 at the first group level.
- C4(b) → `C4(b): uses low count when out counts tie` → strong: equal out counts and differing low counts.
- C4(c) → `C4(c): uses medium count when out and low counts tie` → strong: equal first two counts and differing medium counts.
- C4(d) → `C4(d): uses location code points as the final group tiebreak` → strong: equal all three counts and differing locations.
- C4(e1) → `C4(e1): omits groups with no surviving entries after a state filter` → strong: the excluded H1 group is absent and LC1 is the sole rendered group.
- C4(e2) → `C4(e2): ranks on surviving counts and flips when the state filter changes` → strong: the same fixture orders LC1 first unfiltered and H1 first after the out-of-stock filter.
- C4(f) → `C4(f): enumerates all four within-group comparator levels` → strong: four executable adjacent pairs cover state, quantity, category, and properties.
- C5(a) → `C5(a): state filtering excludes non-selected states` → strong: output contains only the selected state.
- C5(b) → `C5(b): grouped location filtering drops other locations` → strong: output contains only the selected location.
- C5(c) → `C5(c): compact location filtering re-quantifies selected contributions` → strong: quantity changes from 20 to 2 and only LC1's contribution remains.
- C5(d) → `C5(d): compact rows with no selected location disappear` → strong: output is empty.
- C5(e) → `C5(e): an empty location selection means all locations` → strong: the unfiltered compact row is retained unchanged.
- C5(f) → `C5(f): buildReportView composes compact, filter-and-requantify, then sort` → strong: computes expected output through the three declared stages and compares the view.
- C6 → `C6: countPendingRows equals the rendered length in all four grouping and filter cases` → strong: computes the rendered length separately for compact and grouped modes across four cases.
- C7 → `C7: counter tiles ignore state selection and respect location selection in compact mode` and `C7 grouped mode: counter tiles use per-location entries with the same filter rule` → strong: one case per mode proves both halves of D13.
- C8(a) → `C8(a): derives a display-cased single-property config label` → strong: expects `Config: Dining Chairs / Walnut` from lowercase wire data.
- C8(b) → `C8(b): renders catch-all config with the vocabulary's plural category` → strong: expects `Config: Side Tables`.
- C8(c) → `C8(c): renders wildcard config with the exact option key name` → strong: expects `Config: Dining Chairs / upholstery any`.
- C8(d) → `C8(d): orders two config keys by propertyOptions and joins values` → strong: insertion order differs from vocabulary order and values are joined.
- C8 detail clause → `C8 detail: orders members by location and marks only multi-location groups` → strong: asserts member order, source quantities, true for two locations, and false for one.
- C9 → untouched `stock-allowlist.test.ts` C6(b), C6(c), shipped-call-site, and injected-violation probes → strong: the existing allowlist guard passes and its probes demonstrate that an extra state hex/name file changes the matched set.

Every P2-authored test in `stock-report.domain.test.ts` and `stock-states.domain.test.ts` is listed above against a criterion row. The seven tests in `stock-allowlist.test.ts` are inherited shared guards; they were consumed unchanged, with the state-name/hex rows serving C9 and the unrelated environment-flag rows remaining P1 coverage.

## Baseline before production edits

Tree: `de1f0c0d00db663d1c0f8427df62e3dec08543dd` plus dirty diff digest `78aa0cc6ac7021fd0e5ca171bc926eb8338ac4b5b98bcb3ed721129bddfd4b8a`.

The pre-edit targeted run was:

`npx vitest run src/features/stock/domain/stock-report.domain.test.ts src/features/stock/domain/stock-states.domain.test.ts`

It recorded one explicit failing test, `C7 state buckets: groups out, low, medium, and normal/high as rest`, plus one failed report suite with zero tests because the required production module did not yet exist. This is the captured red baseline; report-case failures could not be reconstructed from that unresolved import.

## Mutation ledger

Declared summands: C2/M1 = 1; C5(f)/M2 = 1. Executed = 2, declared = 2.

1. **C2 / M1 — grouping-key integrity**
   - Site: `src/features/stock/domain/stock-report.domain.ts:162`, definition of `groupingKey` inside `compactEntries`.
   - Mutation: changed the single expression from the `(mergeKey, stockState)` key to `entry.mergeKey`.
   - Scope and command: L1, `npx vitest run src/features/stock/domain/stock-report.domain.test.ts -t 'C2:'`.
   - Observed red: `C2: keeps same-key entries in different states as separate rows`; received one output row, while the assertion received length was `1` instead of `2`.
   - Restoration: restored the state component at the same definition site; the focused C2 test passed. The mutation touched only this production file and was fully reverted.

2. **C5(f) / M2 — pipeline order**
   - Site: `src/features/stock/domain/stock-report.domain.ts:300-301`, compact branch of `buildReportView`, definition of the two pipeline stages.
   - Mutation: swapped filtering before compaction.
   - Scope and command: L1, `npx vitest run src/features/stock/domain/stock-report.domain.test.ts -t 'C5\\(f\\)'`.
   - Observed red: `C5(f): buildReportView composes compact, filter-and-requantify, then sort`; received the selected row with quantity `20`, locations `H1 · LC1`, and both contributions instead of quantity `2` and LC1 only.
   - Restoration: restored compact-then-filter order at the same definition site; the focused C5(f) test passed. The mutation touched only this production file and was fully reverted.

Both probes were repeated after the final test-authorship changes and before this handoff. No mutation probe used a wider-than-L1 scope; each focused run skipped the other tests by its stated `-t` filter.

## Evidence and closing stamp

- L1 report/state check after implementation: 47/47 passed before removing the orphan C9 placeholder; final report test file: 31/31 passed.
- L2 `npx vitest run src/features/stock`: 82/82 passed across 6 files on the final authored code tree.
- L4 closing stamp on the finished code tree: `npm test` 82/82 passed across 6 files; `npm run typecheck` passed; `npm run lint` reported exactly 48 errors / 14 warnings, matching the documented repository baseline. No lint problem was reported in any file in this phase's write perimeter.
- The first L4 attempt exposed and was corrected: a union narrowing error at `stock-report.domain.ts:325`; the final L4 typecheck is clean.
- `git diff --check` passed.

## Full write perimeter

Intended code/test changes:

- `src/features/stock/domain/stock-report.domain.ts`
- `src/features/stock/domain/stock-report.domain.test.ts`
- `src/features/stock/types/stock.types.ts`
- `src/features/stock/domain/stock-states.domain.ts`
- `src/features/stock/domain/stock-states.domain.test.ts`

Required artifact:

- `docs/under_development/stock_locations/handoffs/implementer/handoff_plan_2_implement_1.md`

Mutation probes, applied and reverted separately from the intended changes:

- `src/features/stock/domain/stock-report.domain.ts`

Not touched: `stock-allowlist.test.ts`, all fixtures, API files, P3 files, the sibling backend worktree, the master-plan tracker, and the plan file. No architecture graph exists in this repository. The tracker transition and plan Review-log entry remain coordinator work because the dispatch prompt assigns tracker ownership to the coordinator and its hard perimeter excludes those files; the coordinator should consume this handoff and record the phase transition.

## Judgment calls and findings

- `ReportView` is a discriminated-by-shape union: compact mode returns `rows`, grouped mode returns `groups`. Grouped mode filters raw entries; compact mode filters compacted rows so location selection can re-quantify contributions. This is the smallest shape that preserves D12 and M2A for downstream callers.
- `computeCounterTiles` replaces only the state selection with the states present in the current source, then applies the location selection. This implements D13 without spelling state names or duplicating the state-to-bucket mapping.
- `countByStateBucket` uses structural bucket keys `out`, `low`, `medium`, and `rest`; it delegates validation to the existing loud-fail state helper and keeps state names/order knowledge in the state domain.
- The repository lint baseline remains unchanged at 48/14. Fixing unrelated lint findings would violate the phase perimeter.
- No owner decision is pending. The coordinator must advance P2 from `PROMPT_READY` to `IMPLEMENTED` after consuming this handoff; this session did not edit the tracker.
