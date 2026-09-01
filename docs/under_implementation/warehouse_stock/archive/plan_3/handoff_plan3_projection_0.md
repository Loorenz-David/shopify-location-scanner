---
plan: 3
role: projection
round: 0
state: OWNER_DECISIONS_PENDING
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: Claude Opus 5 (1M context)
---

# P3 projection — round 0

**Verdict: AMENDMENTS_REQUIRED** — 12 ledger rows (8 plan gaps, 0 intention gaps, 4 free
choices), 6 reality-check findings, 6 decidability findings, 1 owner card.

## Opening

I built the configuration API on paper from the plan and the shipped code, and the plan holds
up on the parts everyone expected to be hard — the value-casing trap, the two-group
reconciliation, deleting the last configuration in a group. What it does not yet cover is
editing. The plan describes how a configuration is checked when it is created, but not when it
is changed, and it asks for a threshold edit that nothing in the code we already shipped can
actually perform. As written, a user could edit a configuration into a state the create form
would have refused, and it would look completely normal until the number stayed at zero
forever. None of this is broken code — none of it is written yet — so all of it is a paragraph
in the plan rather than a repair later.

One thing needs you personally: after a configuration is created or edited, the system
recounts the stock, and that recount stamps its own name on the row. So the settings page
would show a configuration you just created as last edited by the system, not by you. I have a
recommendation, but the choice of what people should see is yours.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Who should show as the last editor of a stock configuration?

**Question** — After someone creates or edits a stock configuration, should the row show that
person as the last editor, or the system?

**Story** — David opens Stock Location Settings, creates "LC1 / Dining Chairs / any" and saves.
The system immediately counts the 221 chairs already at LC1 into the new configuration and
writes that number to the row. Because a background recount performed that last write, the row
now reads *last edited by system:stock-reconciliation*, a second after David created it. Every
configuration that holds at least one item ends up looking that way, so the "who changed this"
column tells him nothing about who changed it — and the one time somebody really does need to
know who moved a configuration to the wrong location, the column will say the system did.

**Branches**
- **Show the person** — after the recount finishes, the configuration is re-stamped with the
  person who made the change. The column answers the question people ask of it.
- **Show the system** — the column reports whichever write touched the row last, so it reads
  "system" for any configuration holding stock, and "David" only for empty ones.

**Recommendation** — Show the person. The recount is bookkeeping, not an edit anybody made,
and a mixed column is worse than either consistent answer. It is a few lines in the phase being
built now.

**On silence** — the gate holds. The phase is not dispatched until this is answered; nothing is
guessed.

**Trace** — intention §15 (record the authenticated user as updated_by), context §0.3 (system
sentinel), master plan §6.6, plan 3 C7(d), ledger row D5.

## Decision ledger

| # | Decision point | Class | Routing |
|---|---|---|---|
| D1 | Threshold replacement on update has no write path in the shipped code, and no file that could carry one is inside P3's perimeter | plan gap | Amend "Files expected to change" + task 3 (below) |
| D2 | The category-aware whitelist cannot run on the PATCH path where the plan puts it | plan gap | Amend task 1 + task 3; add a C1 row for PATCH |
| D3 | Intra-batch conflict detection is not group-partitioned | plan gap | Amend task 2; pin C2(a)'s fixture |
| D4 | The 409 `details` shape for an intra-batch conflict is undetermined (no persisted id exists) | plan gap | Amend §6.5 + C2(b); fold back to the frontend contract |
| D5 | `updatedByUsername` on the create/update response is the reconciliation sentinel, not the user | plan gap | See owner card 1; then pin C7(d) to exact values |
| D6 | `stock.contract.ts` is listed as new; it exists and P2's shipped files import from it | plan gap | Change "New" to "extend" in the file list |
| D7 | No mapper is named between the internal `LocationStock` type and the wire `LocationStockDto` | plan gap | Amend task 5; name the site and the exact field list |
| D8 | Whitelist treatment of the wildcard `null` criterion shape is unstated | plan gap | Amend task 1; add a C1 acceptance row |
| D9 | `itemCategory` validation is specified only in a context section the plan does not cite | plan gap | Add context §0.16 to Read-first; add a C1 row |
| D10 | What happens when post-commit reconciliation throws after the rows are committed | free choice | Record delegation (recommend: let it propagate) |
| D11 | Threshold semantic validation: zod re-implementation vs the shipped `validateThresholds` | free choice | Record delegation (recommend: zod for shape, domain for semantics) |
| D12 | Response ordering for the summary and detail reads | free choice | Record delegation (recommend: location asc / `createdAt` asc) |

### D1 — threshold replacement has no write path *(named depth target 4)*

Plan task 3 requires "thresholds replace fully (delete + recreate inside the tx)". Nothing in
`src/` writes `StockThresholdsLocation` except the nested `create` inside
`location-stock.repository.ts:110-118`; `grep -rn "StockThresholdsLocation" src/` returns
nothing. The update path is `updateConfig` (`location-stock.repository.ts:177-217`), which
spreads only `location`, `itemCategory` and `properties` — and `UpdateLocationStockInput`
(`contracts/stock.contract.ts:50-54`) has no `thresholds` field at all, though master plan §6.5
and frontend contract §4.5 both declare one.

The unique index `StockThresholdsLocation_locationStockId_state_key`
(`prisma/migrations/20260901180407_add_location_stock/migration.sql:43`) forces delete before
create, so the two writes must share a transaction. The architecture contract puts Prisma access
in repositories only (`backend-contracts.instructions.md:85`) and transaction boundaries outside
controllers and repositories (`:75`). P3's declared perimeter (plan line 13) contains no
repository and no service file, so every compliant implementation of task 3 changes a file
outside the perimeter — which master plan §9.7 makes an automatic finding at phase close.

The dangerous shape is not the perimeter violation, it is the silent one: adding `thresholds?`
to `UpdateLocationStockInput` and passing it to `updateConfig` compiles clean and drops the
field on the floor, because the spread never reads it. Thresholds appear to save and never do.
C4(a) is the only row that would notice, and C4(a) has no manual scenario (E1).

**Proposed amendment** — add `src/modules/stock/repositories/location-stock.repository.ts` to
"Files expected to change", and name the method in task 3:
`replaceThresholds(id, shopId, thresholds, updatedByUsername, tx?)` — deletes the row's
thresholds and creates the submitted three, self-transacting when no `tx` is supplied, in the
manner of `createMany` (`:162-175`). Add `thresholds?: readonly StockThreshold[]` to
`UpdateLocationStockInput` per §6.5. Note in the plan that re-opening a P2 file means P3's close
runs `verify-all.ts`, which it already requires.

**A precondition worth stating in the plan**: `calculateStockState` calls `validateThresholds`
and *throws* on a threshold set that is not exactly the three configurable states
(`domain/stock-state.ts:65`, `:26-29`). A configuration left with zero thresholds — a
delete that commits without its create — makes `computeGroup` throw
(`services/stock-reconciliation.service.ts:78`) for **every** configuration in that
location+category from then on, so a single half-applied threshold edit bricks create, update
and delete for all of its siblings. The plan's "inside the tx" is the right instruction; it is
worth saying what it prevents.

### D2 — the whitelist cannot run where the plan puts it *(named depth target 1)*

Task 1 places the §23.3 category-aware key/value whitelist in `stock.contract.ts`, reached
"via `getPropertyOptionsForCategory`". For create that works: the body carries `itemCategory`
and `properties` together. For `PATCH /stock/configurations/:id` it cannot: the body carries
`itemCategory?` and `properties?` independently, so the schema never sees the pair it must
validate. Task 3's steps are "load-or-404 · apply changes · conflict check excludes self ·
thresholds replace fully · reconcile" — re-validation is not among them, and no C1 row targets
the update path.

An implementer following task 3 literally ships an update endpoint with no property validation.
`PATCH {"properties":{"shape":["Round"]}}` onto a Dining Chairs configuration is then accepted
(`shape` is listed only for the six table categories,
`item-property-options.ts:24-28`), and the configuration matches zero items forever —
the exact failure context §0.4 point 2 says the whitelist exists to eliminate. The same hole
opens from the other side: moving a configuration to a category where its stored keys are
illegal. §23.3 is explicit that validation binds "at create/update".

**Proposed amendment** — task 1 exports the whitelist as a named function taking
`(itemCategory, criteria)`, called by the create schema and by the update command; task 3 gains
a step, after load-or-404, computing the effective `(itemCategory, properties)` pair as
stored ⊕ patch and validating *that* pair. Add C1 row: "the same rejection applies on PATCH —
`shape` patched onto a Dining Chairs configuration → 400, whether or not the patch also changes
the category."

The plan's handling of the casing trap itself is correct and complete: task 1 and C1(i) both
name it, `ITEM_PROPERTY_OPTIONS` does hold display casing (`"Teak"`, `"Up"`,
`"Inside Extension"`) while `normalizeCriteria` lowercases every value
(`domain/property-criteria.ts:33`), and no map value contains a `,`, `/` or `&` that
tokenization would split. C1(a)'s worked example (`shape` on Dining Chairs) is accurate against
the shipped map.

### D3 — intra-batch conflict detection is not group-partitioned *(named depth target 2)*

`findConflict(candidate, siblings)` (`domain/conflict.ts:16-35`) takes criteria only; it knows
nothing about location or item category. Task 2 says "intra-batch + against-existing conflict
checks (§23.2, batch members checked against each other AND existing siblings)" without saying
that members are compared **only within their own (location, itemCategory) group**, and that
the existing-sibling read is `listByGroup` per member's own group.

Written the obvious way — every member against every earlier member — a batch containing
`LC1 + Dining Chairs + {}` and `H1 + Dining Chairs + {}` is rejected 409. Two catch-alls have
the same (empty) key set, and `Object.keys(candidate).every(...)` over an empty key set is
vacuously true (`conflict.ts:24-28`), which is the behaviour §23.2 wants *within* a group and
exactly wrong across groups. Creating a location-wide catch-all for two locations in one
request is among the first things a settings wizard would submit.

C2(a) — "two valid configs → both created" — does not say whether the two share a group, so the
row passes with a same-group pair while the defect ships.

**Proposed amendment** — task 2 states the partition explicitly; C2(a)'s fixture is pinned to
two configurations **in different groups** (e.g. `LC1 + Dining Chairs + {}` and
`H1 + Dining Chairs + {}`), which makes the row bite on this defect.

### D4 — the intra-batch conflict error has no determined shape

§6.5 says conflict details carry `{ conflictingId, batchIndex? }`, and frontend contract §3 and
§4.4 promise `conflictingId` ("the existing definition's id") on every conflict. For a conflict
between two members of the same batch there is no existing definition and no id — nothing is
written (§23.5). C2(b) asks only that the error "names `batchIndex`", with no expected value,
so an implementer reporting index 0 and one reporting index 1 both pass the row.

**Proposed amendment** — §6.5 and C2(b) pin both cases: intra-batch →
`{ batchIndex: <the later member's index>, conflictsWithBatchIndex: <the earlier> }` and no
`conflictingId`; existing-sibling → `{ conflictingId, batchIndex }`. C2(b) asserts
`batchIndex: 1` for the two-member fixture. `contracts/frontend-api-contract.md` §3 and §4.4
need the same correction — a fold-back for the coordinator, since the frontend is building
against the current wording.

### D5 — the response's `updatedByUsername` is the sentinel *(see owner card 1)*

`writeAbsolute` stamps `"system:stock-reconciliation"`
(`services/stock-reconciliation.service.ts:111` and `:176`) on every configuration whose
quantity or state changed. Reconciliation runs post-commit and the DTO is re-read after pass 2
(plan notes 2 and 3), so the create response for the C3(a) fixture — LC1 + Dining Chairs, which
holds 221 units — carries `createdByUsername: "<user>"` and
`updatedByUsername: "system:stock-reconciliation"`. A configuration that receives no items keeps
the user's name, so the field's value depends on whether the group had inventory.

C7(d) — "audit usernames recorded from the authenticated user" — is therefore undecidable as
written: it does not say which value it expects after reconciliation, and the plan's own
fixtures produce the sentinel. Whichever way the owner answers card 1, C7(d) must state the
exact expected value for both the empty-group and non-empty-group cases.

If the answer is "show the person", it is implementable inside P3's amended perimeter:
`updateConfig(id, shopId, { updatedByUsername })` re-stamps the row after reconciliation without
any new repository method.

### D6 — `stock.contract.ts` is not new

Plan line 13 says "New `src/modules/stock/{contracts/stock.contract.ts, …}`". The file exists —
79 lines, committed in `e3eb367` — and P2's plan line 13 anticipated this exactly: "types only
in P2 … P3 adds the zod schemas to this same file". Both shipped P2 files import from it
(`location-stock.repository.ts:14-19`, `stock-reconciliation.service.ts:8-11`). Taken literally,
"new" invites an overwrite that deletes `LocationStock`, `LocationStockCreateData`,
`LocationStockUpdateData`, `GuardedDecrementContext`, `ReconciliationValue` and
`StockOperation`. Typecheck catches it; the round is still spent.

### D7 — no mapper between the domain type and the wire DTO

`toDomain` (`location-stock.repository.ts:69-90`) returns `shopId` and `propertiesCanonical`.
§6.5's `LocationStockDto` and frontend contract §4.3 carry neither. Task 5 says only
"controller + envelopes", and C6(b) says "full DTO incl. thresholds, audit fields, canonical
properties" — so the shortest implementation returns the repository object and leaks the tenancy
id into every stock response, against `backend-contracts.instructions.md:52`. Name the mapping
site and the field list.

### D8 — the wildcard shape has no accepting row

A criterion value has three legal shapes: scalar, array, and `null` (§23.1; frontend contract
§2). C1(i) enumerates two — "valid scalar and array criterion shapes are both accepted". The
wildcard is load-bearing for §6's worked example, §23.2 and §0.13 scoring, and the whitelist
must **skip** `null` entries: `normalized[key]` is `null` for a wildcard, so a value check
written without the guard either throws on `null.some(...)` or rejects every wildcard. Add a
C1 row accepting `{"upholstery": null}` on Dining Chairs, and say the value check skips
wildcards.

### D9 — `itemCategory` validation lives in an uncited section

The plan's Read-first list names context §0.3, §0.4, §0.12, §0.17, §0.18, §3.3–§3.6 and §2.
The section that actually specifies this validator is **§0.16**: `"unknown"` is "deliberately
outside the `ITEM_CATEGORIES` array … and rejected by the `z.enum(ITEM_CATEGORIES)` validator".
No C1 row covers an invalid `itemCategory`, though intention §1 names it as the one validation
the item_type field must carry. Typecheck forces the implementer's hand —
`getPropertyOptionsForCategory` takes `ItemCategory` (`item-property-options.ts:46`) — so this
is low risk, but the citation and the row both belong in the plan.

### D10–D12 — free choices, to be delegated explicitly

- **D10.** Create/update/delete commit, then reconcile. If `reconcileGroup` throws, the rows are
  already written. Propagating gives the client a 500 over a configuration that exists;
  swallowing returns quantity 0 as though it were the count. *Recommend propagating* — §0.17
  makes reconciliation authoritative and any later reconciliation repairs the group, whereas a
  swallowed failure is a wrong number presented as a right one.
- **D11.** C1(c)–(g) can be enforced by zod in the contract or by the shipped
  `validateThresholds` (`domain/stock-state.ts:26-59`), which master plan §6.2 names as their
  home. A zod-only version that checks `length === 3` plus the state enum accepts
  `[low, low, medium]` and fails C1(d). *Recommend* zod for shape and arity, `validateThresholds`
  for the semantic rules, called once.
- **D12.** Neither §17, §18 nor §6.5 specifies ordering for the summary or detail responses.
  *Recommend* location ascending and `createdAt` ascending, stated in the plan so the choice is
  granted rather than taken.

## Reality-check findings

| # | Finding | Artifact |
|---|---|---|
| R1 | `stock.contract.ts` is listed as new and is not (D6) | `plans/plan_3_configuration_api.md:13` |
| R2 | "`src/server.ts` (two mount lines)" — three lines change: the router import beside `server.ts:30` plus the two `app.use` calls, one in each mount block (`:126-135`, `:136-148`) | `plans/plan_3_configuration_api.md:13` |
| R3 | The row count is **28**, not 31 — C1 9, C2 3, C3 2, C4 3, C5 4, C6 3, C7 4. The tracker note and the projection prompt both say 31 (charter manifest property 3: counts are derived, never typed) | `master_plan.md:43`; `prompts/reviewer/prompt_plan3_projection_r0.md:130` |
| R4 | C1(i) carries two distinct obligations under one letter — any-casing acceptance, and scalar *and* array shapes accepted — so neither is separately addressable (manifest property 1) | `plans/plan_3_configuration_api.md:25` |
| R5 | C6's trace `M7(partial)` no longer resolves: §26 rewrote M7 to measure the report endpoint only, which P3's Goal explicitly excludes. C6's real anchors are §17/§18/§0.4 | `plans/plan_3_configuration_api.md:30`; `intention/raw_intention.md:906` |
| R6 | C1 traces to M6, whose subject is conflict prevention and whose guard is ambiguous allocation. C1 measures input whitelisting and threshold validation — a different defect family. §23.3/§2 carry the row; M6 does not | `plans/plan_3_configuration_api.md:25` |

**Verified sound — no finding.** Delete cascade is real: the DDL carries
`ON DELETE CASCADE` (`migration.sql:30`) and `PRAGMA foreign_keys = ON` runs at bootstrap
(`src/shared/database/sqlite-runtime.ts:13`), so C5(a) holds. The empty-group path C5(d) needs
is implemented and returns cleanly (`stock-reconciliation.service.ts:45-47`, `:197-199`,
`:205-207`) — P2 review S2's routing was correct. Both mount blocks exist and no route literal
collides (`/options`, `/locations`, `/configurations` are distinct). Every cited section,
`file:line` and cross-plan reference resolves: P1 review N2, P2 review S2, master plan §11.1.4,
plan 1 C6, and context §0.5's quoted sentence, verbatim. The fixtures are real and
non-degenerate — LC1 + Dining Chairs is 58 rows / **221** units, its Teak subset 28 rows /
**107**, H1 + Dining Chairs 17 rows / **80** — and `LocationStock` is empty, so the scenarios
start clean.

## Decidability findings

| # | Finding |
|---|---|
| E1 | **The checklist covers 12 of the plan's 28 rows.** P3 authors no verify script, so the Manual Scenarios curl checklist is its only instrument for every HTTP row. No step exercises: C1(a)–(h) and the casing half of (i) · C2(b) intra-batch · C4(a) thresholds-only · C4(b) criteria-only edit · C5(d) last-in-group · C6(a) · C7(b) · C7(d) · the bare-mount half of C7(a). Sixteen rows have no step, so a reviewer executing the checklist per master plan §11.1.3 cannot reach a verdict on them |
| E2 | C2(b) asserts that the error "names `batchIndex`", not what it names — no exact expected outcome (charter rule 2). See D4 |
| E3 | C7(d) is undecidable: the plan's own fixtures make `updatedByUsername` the reconciliation sentinel. See D5 and owner card 1 |
| E4 | C6(a) requires "3 configs at one location → `stockCount: 3`"; the checklist never puts three configurations at one location (steps 2 and 3 create two at LC1, step 5 moves one away) |
| E5 | C5(d)'s "leaves every other group untouched" names no instrument. It needs a stated before/after comparison over the other groups, or it is unfalsifiable |
| E6 | No row and no scenario exercises **catch-all against catch-all** — the §23.2 case the intention calls out by name ("the empty key set counts: two catch-alls collide") and the only place `findConflict`'s vacuous `[].every()` is load-bearing. Step 4 duplicates the *Teak* configuration, not the catch-all |

**Proposed checklist additions** (one step each, all cheap): reject-and-accept sweep for C1
(one invalid key, one invalid value, one bad threshold set, one wildcard accepted, `"teak"` /
`"Teak"` / `"TEAK"` accepted); a two-member batch in **different** groups for C2(a); a
same-batch duplicate for C2(b); a duplicate of the LC1 catch-all for E6; a thresholds-only PATCH
for C4(a); a criteria-only PATCH for C4(b); a third configuration at LC1 before reading the
summary for C6(a); delete the last configuration in a group for C5(d); one unauthenticated call
for C7(b); one bare-`/stock` call for C7(a).

## Trace verification

Forward: C2 → M6 ✓ · C3 → M1/M5 ✓ · C4 → M5 ✓ · C5 → M5 ✓ · C7 → no `M` id, by the P2 C7
precedent, correctly declared ✓ · C1 → M6 ✗ (R6) · C6 → M7 ✗ (R5).
Reverse: M1, M5, M6 are each served by at least one row ✓. **M7 is claimed by C6 and served by
no row** — P3 serves no part of the amended M7, which belongs entirely to P5.

## Noticed in passing — outside P3, for the coordinator

`contracts/frontend-api-contract.md` §4.1's JSON sample renders `shape` as
`"categories": ["Dining Tables"]` and shows two of the map's eight `propertyOptions` entries,
with no ellipsis marking either truncation, immediately above the section headed "the exact
payload content, safe to hardcode in mocks". `shape`, `extension_type` and `extension_quantity`
are each valid for six table categories (`item-property-options.ts:24-38`). A frontend built
from that block would refuse those three keys on five of the six table categories, silently.
This is the shape master plan §9.8 was earned on — a JSON example above a table advertising
itself as exact — reappearing in the same document. The complete table below the block is
correct, so this is a fold-back to the contract document, not a P3 plan change, and it is
outside my read order; I report it because it is user-facing and cheap to fix.

## Write perimeter

**One file written, inside the repo:**
`docs/under_implementation/warehouse_stock/handoffs/reviewer/handoff_plan3_projection_0.md`
(this file).

Tree measured: `f874671` ("P3 and P4 linted and projections dispatched"), the commit that
carries the linted plan 3 — verified unchanged, 51 lines, during the session, so every
`file:line` above resolves against it.

`git status --porcelain` also shows `handoff_plan4_projection_0.md` untracked in this folder.
That is the parallel P4 projection session's file, not mine; P3 and P4 share this worktree by
master plan §7.

Nothing else in the repository was created, edited, moved or deleted. No code was written, no
plan or tracker touched, no probe planted, no commit made. All database access was
`sqlite3 -readonly` against `apps/backend/prisma/dev.db` (four `SELECT`s, no `-wal`/`-shm`
mutation).

**Outside the repo:** the harness persisted one oversized tool output to its own session
directory — `…/18375265-8cad-4a2b-b14c-da323133cd50/tool-results/bv6xif92r.txt`, a copy of the
pipeline charter. Not authored by me and not under version control; declared for completeness.

**No skeleton appendix is attached.** The derivation is discarded per doctrine; everything it
produced that matters is a ledger row above.
