---
plan: 1
role: coordinator
round: "-"
date: 2026-09-01
---

# Pre-dispatch lint — `plans/plan_1_schema_domain.md`

Coordinator Responsibility 1c. Every property below was checked **by running a command
against the tree**, not from memory. Verdict at the bottom.

## Precondition — the intention gate

`intention/raw_intention.md:3` reads `**Status: RATIFIED**`, with the ratification act
recorded in its changelog (owner David, 2026-09-01, six decision cards + §24 ledger).
The gate is open; prompts may compile.

## Property 1 — every reference resolves

Command: existence check over every path the plan names.

```
OK   prisma/schema.prisma                                        412 lines
OK   src/shared/category/item-categories.ts                       92 lines
OK   .github/instructions/backend-contracts.instructions.md      119 lines
OK   src/modules/zones/repositories/zone.repository.ts           152 lines
OK   scripts/reconcile-active-sold-items.ts                      583 lines
```

Correctly marked **new** (verified absent, so the plan is not describing something that
already exists): `src/modules/stock/`, `src/shared/item-properties/item-property-options.ts`,
`scripts/verify-stock-domain.ts`.

*Fixtures are references too.* P1's only fixture source is the owner selection sheet.
Its eight map rows name category groups in prose ("tables", "chairs"); the sheet resolves
them to explicit category lists, and **every string in those lists is present verbatim in
`ITEM_CATEGORIES`** — checked against `item-categories.ts:12-41`: `Dining Tables`,
`Bedside Tables`, `Coffee Tables`, `Side Tables`, `Hall Tables`, `Nest Of Tables`;
`Dining Chairs`, `Easy Chairs`, `Armchairs`. No transcription trap.

*Observables are references too.* P1 publishes no payload — its observables are function
return values named in master plan §6.2. All eight are registered there with signatures.

## Property 2 — every count is derived

| Claim | Command | Result |
|---|---|---|
| criteria in P1 | `grep -c "^\| C[0-9]" plans/plan_1_schema_domain.md` | **8** — at the charter's ≤8 target, not over |
| lettered rows | per-criterion summands, printed | C1 5 · C2 6 · C3 6 · C4 6 · C5 6 · C6 8 · C7 6 · C8 8 = **51** |
| file perimeter | paths in "Files expected to change" | **8** (schema, migration.sql, 4 domain files, options map, verify script) |
| Prisma enum support | `grep -c "^enum " prisma/schema.prisma` on a `provider = "sqlite"` datasource | **9** existing enums — context §12.2 is confirmed at source; §6.1's `enum StockState` is not a schema-validation risk |
| dev.db baseline | `sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ScanHistory, …"` | **1107 / 518 unsold / 1 shop** — matches master plan §10 exactly |

The whole-file `grep -o "([a-h])"` returns 52; the 52nd is line 39's reference to `C2(e)`
in the planted-defect note, not a row. Summands, not the total, are the auditable number.

## Property 3 — every criterion row is addressable

All 51 rows are `C<n>(<letter>)`. Swept the **whole plan**, not just the criteria table:
no acceptance claim is stranded inside an ordered task without a row id. Task 7's
instruction ("one PASS/FAIL line per criterion row below") is an instrument obligation,
not a hidden criterion, and it is discharged by the closing-instruments paragraph.

## Property 4 — every row states one exact expected outcome

Spot-verified across the highest-risk criteria: C6's eight boundary rows each name one
state, no disjunctions; C2's six tokenization rows each name one exact token set; C8's
eight conflict rows each name conflict or no-conflict, never "may". No `>=`, no
"one of", no "at least" anywhere in the table.

C1(e) ("migration applies cleanly to dev.db") is manual by construction — an
environment-lifecycle check, the charter's standing exemption to rule 1, and the plan
marks it as such rather than pretending an instrument covers it.

*Every verb in a task is true of the code it names.* P1 creates only new files and adds
to `schema.prisma`; it modifies no existing behaviour, so there is no "preserves current
behaviour" phrasing that could describe an introduction.

## Property 5 — every trace cell resolves

| Row | Trace | Resolves to |
|---|---|---|
| C1 | §23.1, §0.2, §0.20 | mechanism contract (canonical form ⇒ `propertiesCanonical` is the identity) + binding decisions (shopId/cascade; enum declared twice). Charter permits a mechanism contract in place of a ledger ID. **Supports what the row asserts** — opened and read, not assumed |
| C2 | M1, §0.5 | M1 allocation correctness; §0.5 is the tokenizer contract, separators verbatim |
| C3 | M6, §23.1 | M6 conflict prevention; §23.1 canonical form incl. the empty-array hard-fail |
| C4 | M1, §0.5/§0.8/§0.21 | matching, wildcard-requires-key, `{}` catch-all |
| C5 | M1, §0.13 | four-component specificity, incl. the worked examples C5 transcribes |
| C6 | M2, §3 | M2 state boundaries; intention §3 is the boundary table C6 enumerates |
| C7 | M6, §2 | intention §2's mandatory-three + `low < medium < normal` |
| C8 | M6, §23.2 | the general conflict rule, incl. the same-key-set precondition C8(f)/(h) test |

**Reverse direction:** P1 claims to serve M1, M2, M6. Each is served by ≥1 row. The
remaining ledger entries (M3–M5, M7, M8) are claimed by P2/P4/P5/P6 — no entry is
orphaned by the phase split.

## The three checks that belong to no property

- **Perimeter-vs-guard collision.** No occurrence-count or absence assertion exists
  anywhere in the repository to collide with — there is no test infrastructure at all
  (context §15, re-verified). N/A, recorded rather than skipped.
- **A deletion task leaves no unused import.** P1 has no deletion task. N/A.
- **Standing instructions naming this plan.** Master plan §3 (projection **mandatory**
  for P1), §4 (tracker row: gate SATISFIED), §7 (gate-in = owner's property selection).
  All three applied: the gate is satisfied at source, and the projection is being
  dispatched rather than waived.

## Gate self-test

The projection prompt's gate check was run against the tree the session will actually
open, before dispatch. It gates on **content only** — the intention's status header, the
owner-selection heading, and the absence of `src/modules/stock/` — never on a SHA, a
dirty tree, or a file count. (The docs folder carries untracked files today; a
clean-tree gate would halt every session in this project.)

## Verdict

**LINT PASS — plan 1 may be dispatched.** All five manifest properties hold at source,
all three extra checks are discharged, and sizing is at target (8 criteria).

Recorded limit, per the charter: this lint catches omission and arithmetic. It cannot
see a criterion row whose assertion is weaker than the row, and it has never caught a
guard that cannot fail. **What it did not check** is exactly what the projection gate is
for: whether the plan determines every decision the implementer's first hour requires.

---

## Addendum — independent re-verification, 2026-09-01 (successor coordinator session)

A new coordinator session re-ran this lint's checks from source rather than inheriting
its verdict. **The arithmetic reconciles exactly**: 8 criteria; summands C1 5 · C2 6 ·
C3 6 · C4 6 · C5 6 · C6 8 · C7 6 · C8 8 = 51 lettered rows. Gate self-test re-run in the
worktree: intention header `**Status: RATIFIED**` at `raw_intention.md:3`; one
`## ✅ OWNER SELECTION — FINAL` heading; `git branch --show-current` =
`warehouse-stock-backend`; `src/modules/stock/` and
`src/shared/item-properties/item-property-options.ts` both absent. `npm run typecheck`
exits 0 — the §10.0 baseline holds. Orphan sweep over `handoffs/*` and `prompts/*`:
none. The frontend's copy of the contract at
`apps/frontend/docs/under_development/stock_locations/backend_handoff/` is still
byte-identical to `contracts/frontend-api-contract.md` — no drift.

**One defect found and fixed in the projection prompt, before dispatch.** Gate check
line 5 read "no file in `handoffs/` whose frontmatter carries
`state: OWNER_DECISIONS_PENDING`". `handoffs/README.md` documents that state vocabulary
inside a fenced YAML example, so the obvious `grep -rl OWNER_DECISIONS_PENDING handoffs/`
returns a hit and the gate then requires the session to *judge* that the hit is
documentation rather than a row. A gate that needs judgment to pass is a gate that can
halt a session that was right to proceed — the failure class the coordinator doctrine
names as the most expensive kind of prompt defect. Line 5 now anchors the pattern to
line-start `^state:` and states explicitly that the README hit is not a failure.

This is a precision fix to the gate's wording only. It moves nothing the dispatch itself
changes, and the gate remains content-only — no SHA, no dirty-tree check, no file count.
