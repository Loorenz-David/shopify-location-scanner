---
plan: 2
role: projection
round: 0
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: Claude (Opus 5, plan-projection)
---

# Plan 2 projection — report domain (round 0)

## Opening (for the owner)

I did the first hour of plan 2's work on paper, without writing any code, to find the
decisions the plan leaves to whoever implements it. The plan's core defence — the one that
keeps a shortage in one warehouse from being hidden behind healthy stock in another — is
sound, correctly aimed, and testable as written. But the plan is missing the piece that
actually assembles the report list from the raw data, and because that piece is missing, the
order in which filtering and merging happen is undecided; get it backwards and the report
shows correct-looking quantities that are quietly wrong. I found fifteen decisions the plan
does not settle, eight of which could put a wrong number in front of a user.

One question needs you personally: whether the location ranking should react to the state
filter. Everything else is a wording change to the plan or a routing call for the
coordinator, and none of it requires re-opening the ratified intention.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Does the location ranking react to the state filter?

**Question:** When a state filter is active in grouped view, should locations be ranked by
the problem counts *that remain visible*, or by their full unfiltered counts?

**Story:** It is Monday and you filter the report to "Out of stock" only, to plan an
emergency run. Warehouse H1 has 1 out-of-stock and 9 low; LC1 has 3 out-of-stock and none.
Ranking on what you can see puts LC1 first — three empty shelves, and that is the trip you
are planning. Ranking on the full counts puts H1 first, because of nine low rows the screen
is no longer showing you. The list then argues with the filter you just set.

**Branches:** A) Rank on the filtered result — the order always describes the list on screen.
B) Rank on the unfiltered result — order is stable while you toggle filters, but can look
arbitrary.

**Recommendation:** A — it is the same reasoning you already chose for the counter tiles
(D13: tiles describe the report you are looking at), and the ranking sits directly above
the rows it is ordering.

**On silence:** The gate holds; the phase is not dispatched. No guess is made.

**Trace:** MC3, MC5, plan 2 C4, C6, C7.

## Decision ledger

Fifteen rows. Weighted per master plan §3A: **W** = a wrong number or wrong order reaches a
user, silently; **S** = structural/decidability — the implementer must invent something the
plan does not name; **H** = hygiene, waivable.

| # | decision point | weight | classification | proposed routing |
|---|---|---|---|---|
| L1 | Nothing in the project assembles the report list. Which function composes `compactEntries` → `applyStockFilters` → `compareCompactRows`, in which order, and in which phase? | W | plan gap | amend plan 2: add the composition function; amend master plan §6 registry |
| L2 | C6: "length of the rendered list" in **grouped** mode — number of groups, or total entries across groups? | W | plan gap | amend plan 2 C6 wording |
| L3 | `CompactedReportRow` (P1, shipped) carries no per-location contributions, so C5(c) and C8 cannot be computed from it. What is added to the type? | W | plan gap | amend plan 2 task 1 + master plan §6 types |
| L4 | MC2 key 4 — "canonical `properties` rendered to a comparison string": key order source, value rendering, `null` rendering, separators, casing all undefined. | W | intention gap | upstream: lettered addendum **MC2a** (§4B pattern) |
| L5 | C8's config label and C3(d)'s key order both need MC6's key order and `displayValueFor` — which are **P3**, dispatched after P2. | W | plan gap (sequencing) | coordinator: swap P2/P3, or inject the options map (see Findings F5) |
| L6 | MC3 group counts computed before or after the state filter. | W | intention gap | **owner card 1**, then lettered addendum MC3a |
| L7 | C2's named mutation site — "at the `compactEntries` definition" — does not exist if the implementer factors the key into a helper. | W | plan gap | amend plan 2 C2: bind the mutation to the key expression, wherever it lives |
| L8 | Shipped fixtures carry `shape: ["Oval"]`; every contract example returns lowercase wire values. Which casing does the report actually return? | W | reality/upstream | coordinator: correct the P1 fixtures (P2 tests are about to be built on them) |
| L9 | `compactEntries` output ordering is unspecified, but C1(a)/C2 assert positionally. | S | free choice | delegate explicitly: "output order is unspecified; tests assert set-wise or sort first" |
| L10 | MC3's within-group comparator ("MC2 minus key 5") is an eighth function over a different input type, unnamed in the plan and the registry; C4 tests it with "one witness row". | S | plan gap | amend plan 2 task 3 + C4 (enumerate, charter rule 2) |
| L11 | S2 forbids state-name strings outside three allowlisted files; the tiles and group ranking need to name three states. `stock-states.domain.ts` and `stock-allowlist.test.ts` are outside plan 2's perimeter. | S | plan gap | amend plan 2: state the permitted route and widen the perimeter accordingly |
| L12 | C8's literals: `Config: Side Table` (vocabulary says `Side Tables`); `UPHOLSTERY · any` (uppercase and ` · ` derivable from neither MC9 nor the options map). | S | plan gap | amend plan 2 C8 to exact, derivable strings |
| L13 | `computeCounterTiles` return shape, and whether tile labels ("Out", "Rest") live in the domain layer. | S | free choice | delegate: return counts structurally, labels stay in P7 |
| L14 | Read-first cites "contract v1.2 §4.7"; our copy is v1.3. §4B MC1b is not cited although C3/C4 compose over it. | H | plan gap | amend plan 2 Read-first |
| L15 | Intention §4 line 100 and design 01 line 10 both still say tiles come "from the unfiltered result", which ratified D13 overrode. | H | intention gap | upstream: strike/annotate both lines before P7 |

## Findings

### F1 — The report list is assembled nowhere (L1) · weight W

Master plan §6 fixes plan 2's domain exports as exactly seven functions: `compactEntries`,
`compareCompactRows`, `compareGroups`, `applyStockFilters`, `countPendingRows`,
`computeCounterTiles`, `deriveEntryDetail` (`master_plan.md:136-139`). None of them composes
the others. Plan 4's report controller is scoped to "hydrate (report fetch → store raw
entries), filter mutations" (`plans/plan_4_orchestration.md`, Tasks 4) and none of its eight
criteria covers composition. Plan 7 is UI.

So the pipeline lands, by default, inline in a React component in P7 — a phase whose review
is an owner *visual* pass (`master_plan.md:89`). The composition is not cosmetic: MC5 requires
that a compacted row surviving a location filter be re-quantified over the **selected**
contributing locations only (`raw_intention.md:153-155`). Compact-then-filter without
re-quantification returns the full cross-location quantity; the row still renders, the number
is simply too high, and nothing reddens. That is the M2 defect family arriving by a second
door while C2 guards the first.

**Proposed amendment:** plan 2 gains an eighth function — e.g.
`buildReportView(entries, filter) → { rows: CompactedReportRow[] } | { groups: ReportLocationGroup[] }`
— named in master plan §6, owning the order compact → filter+re-quantify → sort. C6 then has a
producer to compare against, and P7 renders what it returns.

### F2 — C6 counts groups where the ratified decision counts entries (L2) · weight W

C6 requires `countPendingRows` to equal "the length of the rendered list from the same inputs".
In grouped mode the rendered list is `ReportLocationGroup[]` (`types/stock.types.ts`), whose
`.length` is the number of **locations**. D12 and MC5 both say the CTA counts *per-location
entries* when grouped (`raw_intention.md:156-158`, `:451-461`). A four-location report holding
eleven entries would show "Show 4" and then render eleven rows — the exact lie D12's story was
written to prevent.

**Proposed amendment:** C6 states the comparator per mode — compact: `rows.length`; grouped:
`groups.reduce((n, g) => n + g.entries.length, 0)` — and keeps "computed both sides, not typed".

### F3 — `CompactedReportRow` cannot answer C5(c) or C8 (L3) · weight W

The shipped type is `{ mergeKey, itemCategory, properties, quantity, stockState, locations: string }`
(`src/features/stock/types/stock.types.ts:20-28`) — `locations` is the rendered `H1 · LC1`
join, and per-location quantities are gone. C5(c) needs LC1's contribution; C8 needs "the
member entries of its group, ordered by location" (MC9, `raw_intention.md:194-196`). Neither is
recoverable from the row. Plan 2 does list `stock.types.ts` in its perimeter but says only "view
types it returns" — leaving the shape to be invented, and P4/P7/P8 bind to whatever appears.

**Proposed amendment:** fix the addition in the plan and in master plan §6, e.g.
`contributions: { location: string; quantity: number }[]` sorted by location code points, with
`locations` remaining the rendered join derived from it. One field serves C1(a), C3(e), C5(c)
and C8.

### F4 — The properties comparison string is undefined in four ways (L4) · weight W

MC2 key 4 reads "canonical `properties` rendered to a comparison string (keys in GET 4.1 order,
values as returned)" (`raw_intention.md:124-126`). Two implementers do not produce the same
string:

1. **Key order source.** "GET 4.1 order" is the index in `StockOptionsDto.propertyOptions`.
   `compareCompactRows` is specified as pure — plan 2 task 5: "All functions take/return the P1
   types — no IO". Nothing passes it the options list. (See also F5.)
2. **Value shape.** `StockPropertyValueDto = string | string[] | null`
   (`types/stock.dto.ts:8`). Scalar vs array rendering is unstated, and the wildcard `null`
   has no comparison rendering at all — MC9's `"any"` is a *label* rule, not a sort rule.
3. **Separators.** Between key and value, between values, between key groups — all unstated.
   Because the comparison is by code points, the separator choice changes the order. It also
   decides whether MC2's "no two distinct rows compare equal" invariant actually holds: with a
   comma separator, `{a:["x,y"]}` and `{a:["x","y"]}` render identically and tie.
4. **Casing.** Unresolved until F6 settles what the wire returns; `"O"` (U+004F) and `"w"`
   (U+0077) sort on opposite sides of the alphabet.

This is a silent ordering failure in the sense charter rule 6 names: every row still renders,
in a different order on a different implementation, with nothing to observe.

**Proposed routing:** upstream, as a lettered addendum **MC2a** in intention §4B — the same
device §4B already used for MC1a/MC1b, and for the same reason: it completes behavior §4A
declared, introduces no new product semantics, and so does not re-open ratification.

### F5 — Plan 2 depends on plan 3 (L5) · weight W

Two of plan 2's obligations need machinery that plan 3 builds:

- **C8's config label.** MC9 requires property values "display-cased, keys in MC6 order"
  (`raw_intention.md:196-199`). Display casing is `displayValueFor(key, wireValue, options)` —
  master plan §6 assigns it to `domain/stock-criteria.domain.ts`, and plan 3 task 1 builds it
  (`master_plan.md:139-140`, `plans/plan_3_config_domain.md`). MC6's own round-trip invariant is
  what forbids a second copy of that mapping.
- **C3(d)'s key order.** Plan 3 C4 is precisely "keys render in GET 4.1 `propertyOptions` order
  regardless of insertion order".

Plan 3 declares "Depends on: P2 APPROVED", but nothing in its content does: its files are
`stock-criteria.domain.ts` and `stock-thresholds.domain.ts`, and its Read-first cites only
MC6–MC8 and contract §2/§4.1. The dependency runs the other way.

**Proposed routing (coordinator):** swap the two phases — dispatch the config domain first,
then the report domain, updating master plan §7 and both plan headers. It costs nothing, since
P3 is genuinely independent. If the order is kept instead, plan 2 must declare that the two
affected functions take the options list as an explicit parameter, and the "no IO" clause must
say that passing vocabulary in is not IO — otherwise the implementer reads the clause as a ban
and inlines a private casing map, which is the duplication MC6 exists to prevent.

### F6 — The shipped fixtures disagree with the contract about value casing (L8) · weight W

Every contract example returns lowercase property values: §4.7 `{"wood_type": ["walnut"]}`
(`frontend-api-contract.md:128`), §4.3 `{"wood_type": ["teak"]}` (`:86`), and the v1.2 notice
repeats the lowercase form (`handoff_report_contract_v1_2_notice.md:48`). MC6 confirms the
direction — fetched values are matched *case-insensitively* into the options map, "falling back
to the raw wire value when unmatched" (`raw_intention.md:169-171`) — which only makes sense if
the wire and the vocabulary differ in case.

Both shipped fixtures mix the two: `get-stock-report.fixture.ts:26` and
`get-stock-location-detail.fixture.ts:26` carry `shape: ["Oval"]` while their sibling entries
carry `wood_type: ["walnut"]`. S4 requires fixtures to copy the contract verbatim
(`master_plan.md:287`).

Consequence if left: P2's C8 and P3's C2 both exercise the display-casing map on data that is
already display-cased, so the map reads as a correct no-op in every test, and the first real
payload renders `oval` in the entry detail. It also silently decides F4's casing question.

**Proposed routing:** coordinator corrects the two fixture values to lowercase before P2 is
dispatched — a two-character edit in a phase that is already APPROVED, made now because P2's
tests are about to be written against them.

### F7 — C2's named mutation may have no site (L7) · weight W

C2 names the mutation "remove `stockState` from the grouping key **at the `compactEntries`
definition**". Charter rule 11 requires a named mutation to name where it is applied, and this
one does — but the site is only guaranteed to exist if the key is built inline. An implementer
who writes `function compactionKeyOf(entry)` and calls it from `compactEntries` leaves the
plan's stated site empty, and the reviewer scoped to "the compaction and ordering mechanisms"
(`master_plan.md:87`) has to improvise the one probe this phase exists to run.

This is the phase's single M2A guard. Everything else in the plan can be recovered in a later
round; this one cannot, because the defect it catches is invisible.

**Proposed amendment:** C2 binds the mutation to the artifact rather than the location —
"delete the `stockState` component wherever the compaction grouping key is constructed
(definition site, not a call site); the plan requires that site to be a single expression" —
and the handoff records the file and line at which it was applied.

**What C2 gets right, verified adversarially:** on the notice's fixture (walnut chairs, 2 @LC1
`low_in_stock` and 18 @H1 `normal_in_stock` — `handoff_report_contract_v1_2_notice.md:88-93`,
which is exactly where C2's numbers come from), the mutation collapses two rows into one 20-unit
row, reddening both the length and the quantity assertion. No other property of that fixture
keeps the row green (charter rule 2's companion). The one implementation C2 alone would not
catch — grouping by `(mergeKey, stockState, location)`, i.e. no merging at all — is caught by
C1(a) over the same function. The pair is jointly sufficient.

### F8 — Ordering rows must state that they tie on every earlier level (L10 companion) · weight S

C3 requires "one row per adjacent tiebreak level" and C4 four group-level pairs; the rows only
bite if each pair is **equal on all preceding levels** and differs only at the named one.
Otherwise a comparator whose level 4 always returns 0 still passes C3(d), because level 3
already separated the pair. The plan implies this and does not require it.

Separately, C4 tests the within-group ordering — MC3's "MC2's comparator minus keys (5)"
(`raw_intention.md:136-137`), an eighth function over `StockReportEntryDto` rather than
`CompactedReportRow`, named in neither the plan's task list nor master plan §6 — with "one
witness row". That is sampling a four-level ordering, which charter rule 2 forbids in exactly
this shape.

**Proposed amendment:** name the within-group comparator in task 3 and the registry; state the
tie-on-earlier-levels obligation once in C3 and C4; enumerate the within-group pairs.

### F9 — S2 leaves plan 2 no declared way to name a state (L11) · weight S

The tiles need Out / Low / Medium / Rest = Normal + High (MC5), and group ranking needs
count(out), count(low), count(medium) (MC3). S2 confines state-name strings to
`stock-states.domain.ts`, `types/stock.dto.ts` and `api/mocks/*.fixture.ts`, and the shipped
guard asserts **set equality** over that allowlist (`src/features/stock/stock-allowlist.test.ts`,
`C6(c)`). A `stock-report.domain.ts` containing `"out_of_stock"` turns that P1 test red at
plan 2's closing stamp — and `stock-allowlist.test.ts` is not in plan 2's perimeter, so the
implementer's options are an undeclared edit to a P1 test or an unguided workaround.

Positional access (`STOCK_STATES.slice(0, 3)`, `.slice(3)`) passes the scan, and master plan §9
L5 explicitly permits indices as non-subjects (`master_plan.md:279-282`) — but MC1's own prose
forbids restating "a state name, order index, or state hex" (`raw_intention.md:116-118`), so the
two authorities point opposite ways and the plan resolves neither. The cleaner route — naming
the buckets in `stock-states.domain.ts` — also sits outside the declared perimeter.

**Proposed amendment:** plan 2 states the permitted route explicitly and widens "Files expected
to change" to match it. If the route is a named export from the state domain, that file and
`stock-allowlist.test.ts` join the perimeter and the allowlist gains the report domain.

### F10 — C8's literals do not resolve (L12) · weight S

- `Config: Side Table` — the vocabulary is 28 values including `Side Tables`, plural
  (`frontend-api-contract.md:48`, `master_plan.md:295-301`). `Side Table` is not among them; an
  implementer typing the plan's literal writes a test about a category that cannot exist.
- `UPHOLSTERY · any` — MC9 says a wildcard key "renders its key name + 'any'"
  (`raw_intention.md:198-199`). The options key is `upholstery`, lowercase
  (`api/mocks/get-stock-options.fixture.ts`, `frontend-api-contract.md:74`). The uppercase form
  and the ` · ` separator come from D9's **wizard chip** rendering
  (`raw_intention.md:420-421`) — a different surface, owned by MC6 and P5. Taking it into MC9's
  config label puts a presentational transform in the domain layer and pins a string the label
  rule does not produce.

**Proposed amendment:** C8 uses `Config: Side Tables`, and states the wildcard's exact label
rendering as MC9 defines it, or MC9 gains the missing sentence upstream.

### F11 — Free choices to delegate in writing (L9, L13) · weight S

- **`compactEntries` output order** is unspecified — MC4 defines grouping and summation only
  (`raw_intention.md:139-148`); ordering is `compareCompactRows`' job. Yet C1(a) asserts a
  rendered `H1 · LC1` and C2 asserts "two rows (2/low, 18/normal)" in a stated order. Delegate:
  output order is not part of the contract; C1/C2 assert set-wise, or sort before asserting.
- **`computeCounterTiles` return shape.** Design 01 names the four tiles Out/Low/Medium/Rest
  (`design_handoff/01-report-compacted/01-report-compacted.md:10`), but those labels are not in
  MC1's label map ("Out of stock", "Low", "Medium", "Normal", "High") and plan 2's Read-first
  does not include the design handoff. Delegate: return counts structurally (four numeric
  fields), labels stay in P7.

### F12 — Hygiene (L14, L15) · weight H

- Plan 2's Read-first cites "contract v1.2 §4.7". Our copy is **v1.3**
  (`frontend-api-contract.md:4`; master plan §10 confirms v1.3 is authoritative). §4.7's content
  is unchanged between the two, so nothing is wrong — only the citation. Master plan §6 line 171
  and S4 carry the same stale "v1.2" string.
- Plan 2's Read-first omits §4B **MC1b**, the comparator contract C3 and C4 compose over.
  *(Reality check performed as instructed: `compareByStateIndex(a: StockState, b: StockState):
  number` is exported from `src/features/stock/domain/stock-states.domain.ts:68-73` and returns
  `aIndex - bIndex`, i.e. exactly `0` for equal states. The signature plan 2 assumes is the
  signature P1 ships — this seam is clean.)*
- Intention §4 line 100 ("Counter tiles: counts per state over the *unfiltered* current report
  result") and design 01 line 10 ("entries per state from the unfiltered result") both survive
  from before D13 ratified "respect the location filter, ignore the state filter"
  (`raw_intention.md:407-408`, `:463-474`). Neither is in plan 2's Read-first, so plan 2 is not
  at risk; P7's is where this bites. One annotation each, before P7.

## Checks that passed

Recorded so the coordinator does not re-derive them:

- **Trace chain, both directions.** All eight criterion rows carry a trace cell that resolves
  and supports what the row asserts. Every mechanism the phase claims to serve (MC2, MC3, MC4,
  MC5, MC9) and every ledger entry (M2, M2A) is served by at least one row: M2A by C2 alone,
  MC4 by C1 and C2, MC2 by C3, MC3 by C4, MC5 by C5/C6/C7, MC9 by C8. No untraced row, no
  unserved claimed entry.
- **Enumeration counts.** MC2 has five tiebreak levels; C3 enumerates five adjacent pairs.
  MC3 has four levels; C4 enumerates four. Neither samples at the level it names (the sampling
  problem is C4's *within-group* clause — F8).
- **The P1 seam.** `compareByStateIndex` verified in the shipped source, not the document (F12).
- **`mergeKey` opacity.** The plan's Notes forbid constructing semantic keys and require fixture
  strings like `"k1"`, matching the contract's "never parse it" and the notice's "never parse,
  never construct, never persist".
- **Quantity-0 entries.** The plan's Notes carry the v1.2 obligation correctly.

## Sizing

8 criteria — at the charter ceiling — decomposing into **31 addressable sub-rows** (C1: 4,
C2: 1, C3: 6, C4: 5, C5: 5, C6: 4, C7: 2, C8: 4). A split at C4/C5 would be structurally clean:
compaction and ordering first, then filters/counts/tiles/detail, with `compactEntries`' signature
as a stable seam.

**I do not recommend splitting.** Under master plan §3A the cost of a whole extra
implement-and-consume cycle is real and the benefit is process rigor, which §3A explicitly
declines to buy. Every ledger row above is a paragraph amendment, not new scope; none of them
grows the phase. The one caveat worth stating: F1's composition function adds an eighth export
and C6 gets a real producer, so if the coordinator does split, the seam should fall *after* the
composition function, not before it.

## Write perimeter of this session

One file created: `handoffs/reviewer/plan_2_round_0_projection_handoff.md` (this document).

No other file was created, edited, moved or deleted. No code was written. No plan, intention,
master plan or contract was modified. No test suite was run — L4 budget 0, and no L1 run was
needed: `compareByStateIndex` was verified by reading
`src/features/stock/domain/stock-states.domain.ts`, per the prompt's "prefer reading it". No
`.archgraph` in this repo (master plan §8 — skip silently).

Read-only inspection performed: the two doctrine files, plan 2, plans 3 and 4, master plan
§§3A/4/5/6/7/9/10, intention §§4/4A/4B/5/8/9/9A/10, contract v1.3 §§4.1/4.3/4.7/5/7, the v1.2
notice §§2/3/4, design 01, and the shipped P1 source under `src/features/stock/`.

## Discarded skeleton (non-authoritative appendix — the implementer must not receive this)

Recorded only to show the derivation the ledger came from; it is not guidance and carries no
authority. The paper walk produced this pipeline, and every arrow below is a place where the
plan stopped determining the next step:

```
StockReportEntryDto[]  (raw, from the store — P4)
   │
   ├─ compactEntries ──────────────► CompactedReportRow[]        ← output order?  (L9)
   │    group on (mergeKey, stockState)                          ← mutation site? (L7)
   │    sum quantity; dedupe + code-point sort locations
   │    retain per-location contributions                        ← type gap       (L3)
   │
   ├─ applyStockFilters ───────────► filtered rows / groups      ← input type?    (L1)
   │    state ∈ states AND (locations ∅ OR ∩ ≠ ∅)
   │    re-quantify over SELECTED contributions only             ← order matters  (L1)
   │
   ├─ compareCompactRows ──────────► sorted rows
   │    1 compareByStateIndex  (P1 ✓)
   │    2 quantity asc
   │    3 itemCategory, case-insensitive, code points
   │    4 properties → comparison string                         ← undefined ×4   (L4, L5)
   │    5 joined location list
   │
   ├─ compareGroups ───────────────► sorted groups
   │    count(out) desc, count(low) desc, count(medium) desc     ← filtered?      (L6)
   │                                                             ← naming states? (L11)
   │    then location asc; entries within: keys 1–4              ← unnamed fn     (L10)
   │
   ├─ countPendingRows ────────────► number                      ← of what?       (L2)
   ├─ computeCounterTiles ─────────► Out/Low/Medium/Rest         ← shape, labels  (L13)
   └─ deriveEntryDetail ───────────► contributing rows + label   ← needs P3       (L5, L12)

   MISSING: the function that runs the above in order.                            (L1)
```
