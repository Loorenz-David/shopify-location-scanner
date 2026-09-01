# Plan 2 — Report domain (compaction, ordering, filters, detail)

**Implementer:** Codex · **Depends on:** P1 APPROVED **and P3 APPROVED** · **Projection: mandatory** (MC2–MC5, MC9)

*(P2 and P3 were swapped on 2026-09-01 — master plan §7. C8's config label needs P3's
`displayValueFor`, and MC6's round-trip invariant forbids a second copy of that mapping.)*

## Goal
Pure domain functions for the whole report area: compaction, both total orderings, the
filter model with its counts, entry-detail derivation, **and the one function that composes
them into the rendered view**. NOT in this phase: stores, flows, UI, PDF assembly.

## Read first
Master plan §6 (Domain — including the three structural notes on the pipeline owner, the
`contributions` field, and comparator factories) · intention §4A MC2, MC3, MC4, MC5, MC9 +
**§4B MC1b, MC2a, MC3a** + §5 + §8 (M2, **M2A**) · contract **v1.3** §2 (value normalization
and casing), §4.1, §4.7 · `backend_handoff/handoff_report_contract_v1_2_notice.md` §3.

## Files expected to change
`src/features/stock/domain/stock-report.domain.ts` (+ `.test.ts`),
`src/features/stock/types/stock.types.ts` (view types it returns),
`src/features/stock/domain/stock-states.domain.ts` (+ its existing `.test.ts`) — for
`countByStateBucket` only; nothing else in that file changes.
**Not in perimeter:** `stock-allowlist.test.ts`. It must stay green untouched (see C9).

## Tasks
1. `compactEntries` per MC4 (group `(mergeKey, stockState)`; sum; locations deduped,
   code-point sorted; **retain `contributions`**). 2. `makeCompactRowComparator(keyOrder)`
   per MC2 + MC2a (5 tiebreak levels). 3. `compareGroups` per MC3 + MC3a, and
   `makeGroupEntryComparator(keyOrder)` (MC2's comparator minus key 5, over
   `StockReportEntryDto`). 4. `applyStockFilters`, `countPendingRows`,
   `computeCounterTiles` per MC5 (D12/D13 as ratified); `countByStateBucket` in the state
   domain. 5. `deriveEntryDetail` per MC9, using P3's `displayValueFor`. 6.
   `buildReportView(entries, filter, keyOrder)` — compact → filter (re-quantifying) → sort.
   All functions take/return the P1/P3 types and perform **no IO**; receiving `keyOrder` or
   an options list as a parameter is not IO.

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Compaction: (a) two same-key same-state entries merge — quantity summed, locations `["H1","LC1"]` sorted, rendered `H1 · LC1`, **`contributions` = `[{H1,…},{LC1,…}]` code-point sorted with each source quantity intact**; (b) per-state quantity conservation on a mixed fixture; (c) no `(mergeKey,state)` pair twice in output; (d) single-entry group passes through unchanged apart from the locations/contributions wrappers. | MC4, M2 |
| C2 | **Compaction key integrity:** same-key entries in *different* states (low 2 @LC1, normal 18 @H1) yield two rows (2/low, 18/normal), never 20. **Named mutation M1:** delete the `stockState` component wherever the compaction grouping key is constructed — the definition site, not a call site; the implementation must keep that site a single expression so the mutation has exactly one target. The handoff records the file and line at which it was applied. | **M2A**, MC4 |
| C3 | Row ordering — one row per adjacent tiebreak level (enumerate, never sample). **Each pair must be equal on every preceding level and differ only at the named one**, else a comparator that ignores the named level still passes: (a) state beats quantity (out/q9 before low/q1); (b) equal state → quantity asc; (c) equal both → category code-point asc, case-insensitive; (d) equal through category → MC2a properties string asc; (e) equal through properties → location-list asc. Comparator returns 0 only for identical rows. | MC2, MC2a, M2 |
| C4 | Group ordering — adjacent pairs, each equal on all preceding levels: (a) out-count 3/low 0 before out 1/low 4 (D11); (b) equal out → low desc; (c) equal out+low → medium desc; (d) all three equal → location asc. **(e) MC3a**, two rows: **(e1)** a group whose every entry is excluded does not appear at all (fixture: H1 = 3 out + 0 low, LC1 = 0 out + 12 low; filter `{low_in_stock}` ⇒ only LC1 renders — under unfiltered counts H1 would have *led* the list while showing no rows). **(e2)** ranking uses surviving counts (fixture: H1 = 1 out + 0 low, LC1 = 1 out + 4 low; no filter ⇒ LC1 first on low desc; filter `{out_of_stock}` ⇒ both 1/0/0, tiebreak location asc ⇒ H1 first). The pair must flip, or the row does not bite. **(f)** `makeGroupEntryComparator` orders within a group by C3(a–d)'s four levels — enumerated as four adjacent pairs, not one witness. | MC3, MC3a, M2 |
| C5 | Filters: (a) state-subset excludes non-selected states; (b) location-subset in grouped mode drops other locations' entries; (c) location-subset in compact mode: row with contributions {LC1:2, H1:18} filtered to {LC1} keeps the row with quantity **2**, LC1's contribution only; (d) row with no selected location disappears; (e) empty location set = all. **(f) Pipeline order — `buildReportView` on the mixed fixture equals compact → filter+re-quantify → sort. Named mutation M2:** swap the first two stages so filtering precedes compaction → (c)'s quantity becomes 20 and this row reds. | MC5, M2 |
| C6 | Counts: for every grouping × filter combination in a 4-case table, `countPendingRows` equals the length of what `buildReportView` returns for the same inputs — **compact mode: `rows.length`; grouped mode: `groups.reduce((n,g) => n + g.entries.length, 0)`, the per-location entries D12 counts, not the number of groups**. Computed both sides, never typed. | MC5 (D12), M2 |
| C7 | Tiles via `countByStateBucket`: Out/Low/Medium/Rest where Rest = normal+high; **state filter ignored, location filter respected (D13)** — one case proving each half of that sentence; computed in the current grouping mode (one case each mode). | MC5 (D13), M2 |
| C8 | Entry detail: contributing rows = group members ordered by location; multi-location flag true only when >1 location; config label per MC9 using P3's `displayValueFor` — (a) values case `Config: Dining Chairs / Walnut` from wire `{wood_type:["walnut"]}`; (b) catch-all `Config: Side Tables` (the vocabulary's plural form, contract §4.1); (c) wildcard `Config: Dining Chairs / upholstery any` — key name exactly as it appears in `propertyOptions`, per MC9's "key name + 'any'"; (d) two keys render in `propertyOptions` order regardless of insertion order, values joined `", "`. | MC9, M2 |
| C9 | The shipped `stock-allowlist.test.ts` still passes **unmodified**: no file this phase adds or edits contains a state-name string or a state hex. Proven by running it, not by inspection. | MC1, S2 |

## Notes
**Mutation count 2** — C2 (M1, grouping key) · C5(f) (M2, pipeline order). Both are applied
at a definition, both named with their site.

Quantity-0 entries are data, never filtered as empty (v1.2 notice). `mergeKey` is
opaque — no test may construct semantic keys (use fixture strings like `"k1"`).

**Delegated free choices** *(projection L9, L13 — decided here so nothing is invented
silently)*:
- **`compactEntries` output order is unspecified.** MC4 defines grouping and summation
  only; ordering is the comparators' job. C1 and C2 therefore assert **set-wise**, or sort
  before asserting — never on incidental output position.
- **`computeCounterTiles` returns counts structurally** — four numeric fields named `out`,
  `low`, `medium`, `rest`. The display labels ("Out", "Low", "Medium", "Rest") are P7's;
  they are not MC1 label-map values and no domain function emits them.
- **MC9's wildcard label** is read literally: key name as it appears in `propertyOptions`
  (lowercase), then ` any`. The plan's earlier `UPHOLSTERY · any` came from D9's wizard-chip
  rendering, a different surface owned by MC6/P5; it would have put a presentational
  transform in the domain layer. If P7 wants a prettier form it does it in P7.
  **The wizard chip's `UPHOLSTERY · any` (D9, plan 3) is a different surface and stays as it
  is** — the two renderings diverge by ratified decision, not by oversight.

## Review log

- **Round 0 (projection, 2026-09-01) — AMENDMENTS_REQUIRED, all 15 ledger rows routed, none
  waived.** Weighted per §3A: 8 rows could put a wrong number in front of a user, 5 were
  structural (the implementer would have had to invent something), 2 hygiene. Adopted:
  the composition function and its named mutation (F1/L1), C6's per-mode comparator
  (F2/L2), `contributions` on the row type (F3/L3), MC2a upstream for the comparison string
  (F4/L4), the P2↔P3 swap (F5/L5), MC3a for filtered group ranking (owner card 1 = A,
  L6), C2's mutation bound to the key expression rather than a location (F7/L7), the
  fixture casing correction (F6/L8), the two written delegations (F11/L9, L13), the named
  within-group comparator with enumerated pairs and the tie-on-earlier-levels obligation
  (F8/L10), the `countByStateBucket` route plus C9 to prove the allowlist survives
  (F9/L11), C8's exact literals (F10/L12), and both hygiene items (F12/L14, L15).
- **Coordinator verification of the handoff.** Write perimeter matched `git status` exactly
  (one file). Ledger arithmetic reconciles: 15 rows, 8 W + 5 S + 2 H; sub-row count 31
  re-derived from the criteria table. L4 budget 0 was respected — no suite was run.
  Independently confirmed against the tree, not the handoff: `CompactedReportRow` has no
  per-location field; the allowlist guard matches **case-insensitively** over a file set
  excluding tests, so its C6(c) really would have gone red; `Side Tables` is the plural
  vocabulary form; `compareByStateIndex`'s shipped signature matches MC1b.
- **Two projection claims corrected.** *(i)* Owner card 1's story ("H1 has 1 out and 9 low,
  LC1 has 3 out" ⇒ unfiltered ranking puts H1 first) is arithmetic from design 02's **summed**
  problem count — the reading MC3/D11 explicitly overrode in favour of the contract's stepwise
  lexicographic rule. Under the ratified rule LC1's 3 out beats H1's 1 out either way, so that
  fixture discriminates nothing. Option A is still well-defined and materially different from B,
  just not where the story said: the sharpest real case is filtering to `{low_in_stock}`, where
  unfiltered counts would put a warehouse with 3 out-of-stock and **no low rows at all** at the
  head of your low-stock list. C4(e) is built on that instead, and MC3a records it. *(ii)* Owner card 1 recommended option A by citing D13 as
  the same reasoning. D13 is the opposite pattern — it makes the tiles **ignore** the state
  filter. The owner chose A independently and it stands on its own merits, but the stated
  rationale was wrong, so MC3a records the real one: tiles summarize the whole report,
  the group ranking orders the visible list. Nothing downstream depended on the bad citation.
- **Sizing:** 9 criteria, one above the charter ceiling, accepted without splitting. The
  projection's reasoning is adopted — every ledger row was a paragraph amendment rather
  than new scope, and under §3A a second implement-and-consume cycle buys process rigor
  the owner has explicitly declined to pay for. C9 is a one-line guard, not a ninth subject.
