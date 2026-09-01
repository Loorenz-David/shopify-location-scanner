---
plan: 1
role: projection
round: 0
state: IMPLEMENTED
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: Claude Opus 5 (1M context) — plan-projection doctrine
---

# P1 projection (round 0) — decision ledger

> Note on `state:`: `handoffs/README.md` offers `IMPLEMENTED | OWNER_DECISIONS_PENDING |
> CONSUMED`. Nothing here needs the owner and the coordinator has not consumed this, so
> `IMPLEMENTED` is used in its "delivered, awaiting consumption" sense. The vocabulary has
> no projection-specific value; extending the README is the coordinator's call.

## 1. Verdict

**AMENDMENTS_REQUIRED** — six plan gaps and one trace gap. None of them are semantic holes
and none reach the intention: every gap is closable by editing `plan_1_schema_domain.md`
(and, for one of them, a single citation line). Five further points are genuine implementer
freedom and are proposed as explicit delegations.

The plan's core is sound. Its dangerous mechanisms — canonical form, tokenization,
specificity ordering, conflict detection, state boundaries — are enumerated correctly and
each named worked example re-derives to the answer the plan states. I found **no case
where a criterion row asserts something its cited authority contradicts**, and no
arithmetic error in the plan's parentheticals.

## 2. ⚠ OWNER DECISIONS REQUIRED (0)

Nothing here needs the owner. Every finding is a plan-text amendment the coordinator can
make from already-ratified authority.

## 3. Decision ledger

| # | Decision point | Classification | Proposed routing |
|---|---|---|---|
| F1 | Type of `matchesCriteria`'s `itemProperties` parameter, and behaviour on non-string property values | **plan gap** | Fix the signature in master plan §6.2; see §4.1 |
| F2 | `item-property-options.ts` + `getPropertyOptionsForCategory` ship with **no** acceptance criterion | **plan gap** | Add criterion C9; see §4.2 |
| F3 | Does `validateThresholds` reject a threshold for a **non-configurable** state? C7 has no row; task 2's wording is ambiguous | **plan gap** | Add C7(g); tighten task 2 wording; see §4.3 |
| F4 | Which error class the domain throws for C3(f) / C7 hard-fails is named nowhere in P1's declared read scope | **plan gap** | Add one citation to the plan's Read-first; see §4.4 |
| F5 | Verify script: is C1 in scope, and how are multi-input rows C3(f)/C7(c) reported under "one line per row"? | **plan gap** | Amend task 7; see §4.5 |
| F6 | One planted-defect probe is prescribed for a 46-row instrument (charter rules 12 & 15) | **plan gap** | Prescribe one probe per criterion group; see §4.6 |
| F7 | C1's trace cell names no measurement-ledger ID, which intention §24 requires of every criterion | **trace gap (plan)** | Amend C1's trace cell; see §4.7 |
| D1 | Comparator for "sorted lexicographically" (keys and values) | free choice | Delegate — recommend code-unit `.sort()`, **never** `localeCompare` |
| D2 | `calculateStockState` behaviour outside its validated domain (negative quantity; missing or duplicated threshold state) | free choice | Delegate — recommend `quantity <= 0 → out_of_stock`; thresholds treated as a precondition |
| D3 | `findConflict` when several siblings conflict — which id is returned | free choice | Delegate — first match in input order |
| D4 | Item property present but tokenizing to the empty set (e.g. `""`) — does a wildcard match it? | free choice | Delegate — treat as key-absent |
| D5 | Return shape of `specificityScore` (tuple vs object) | free choice | Delegate — implementer's call |

## 4. Findings

### 4.1 F1 — `matchesCriteria`'s item-properties type is not fixed (plan gap)

`master_plan.md:112` (§6.2) fixes the signature as
`matchesCriteria(itemProperties, criteria): boolean` — **untyped on the parameter that
carries the item**. §6 opens "Everything below is **fixed**", so the implementer has no
licence to choose, yet nothing in P1's read scope determines the type. Two exported
candidates exist in the tree and they behave differently:

- `ItemProperties = Record<string, string>` — `src/shared/item-properties/item-properties.ts:7`
- `Record<string, unknown> | null` — `src/modules/scanner/domain/scan-history.ts:65`

Neither is directly usable as written: C4(e)/(f) require `properties = null` to be a legal
input, so `ItemProperties` needs `| null`; and if `unknown` is chosen, the behaviour on a
non-string value (number, array, nested object) is undefined — tokenize `String(v)`, or
treat the key as absent? Those differ observably.

There is no shortcut: `normalizeStoredProperties`
(`src/modules/scanner/repositories/scan-history.repository.ts:129-154`) does exactly this
job but is **not exported**, and that file is out of perimeter for every phase
(master plan §9.6 / context §0.10). So the stock module must own the decision.

This is cross-phase, not cosmetic — P2's repository and P4's `applyItemStockChange`
(`before/after: { … properties … }`, §6.4) both hand this function its input, and §6.4
leaves `properties` untyped there too.

**Proposed amendment** (master plan §6.2, and mirrored in §6.4):
`matchesCriteria(itemProperties: Record<string, string> | null, criteria: StockCriteria): boolean`,
with a one-line note that the caller (P2's repository) is responsible for reducing the
Prisma `Json` value to `Record<string, string> | null` — dropping non-string values and
empty-after-trim values, i.e. the same reduction `normalizeStoredProperties` performs,
re-implemented inside the stock module. This keeps the domain pure and matches D4.

### 4.2 F2 — the options map has no acceptance criterion (plan gap)

Task 6 authors `src/shared/item-properties/item-property-options.ts` — eight keys, their
value lists, their category grouping, and `getPropertyOptionsForCategory`. **No row in
C1–C8 mentions any of it.** Task 7's script emits "one PASS/FAIL line per criterion row
below", so the map is verified by nothing, and the reviewer has no artifact to check the
transcription against.

Context §0.4 calls this map load-bearing in three places, one of which is the validation
whitelist that "eliminates the silent 'config matches zero items forever' failure". A
mistranscribed value list is precisely that silent failure, shipped into P3's validation
and the frontend's form.

The content itself is fully determined — I verified it end to end:

- `context/property-options-selection.md:70-79` is an explicit 8-row table.
- The group expansions at `:65-66` resolve correctly against the real vocabulary:
  **tables** = the six `ITEM_CATEGORIES` entries containing "Table"
  (`src/shared/category/item-categories.ts:20-26`, Writing Desks correctly excluded);
  **chairs** = the three containing "Chair" (`:13-15`), which is exactly what
  `isSeatingCategory` (`:91-92`) selects.
- No map value contains `,`, `/` or `&`, so every criterion value is a single token under
  §0.5 — the map and the tokenizer cannot disagree.

So this is a missing *check*, not a missing decision.

**Proposed amendment** — add:

> | C9 | Options map: (a) exactly the 8 keys of the owner table, no others; (b) each key's
> value list matches that table exactly, in that order; (c) `wood_type`, `years`,
> `weight_definition`, `country` are `"universal"`; (d) `shape`, `extension_type`,
> `extension_quantity` list exactly the six Table categories; (e) `upholstery` lists
> exactly the three Chair categories; (f) `getPropertyOptionsForCategory("Sofas")` returns
> the 4 universal entries only; (g) `getPropertyOptionsForCategory("Dining Tables")`
> returns those 4 plus `shape`, `extension_type`, `extension_quantity`; (h)
> `getPropertyOptionsForCategory("Dining Chairs")` returns those 4 plus `upholstery` |
> M1, §23.3, `property-options-selection.md` §OWNER SELECTION |

**Sizing tension, flagged for the coordinator, not resolved here:** the charter targets
≤ 8 criteria per phase and P1 is already at exactly 8. C9 makes 9. The alternative —
leaving a load-bearing transcription unverified — looks worse to me, but the call is the
coordinator's. If the count must hold, C1(e) (the manual migration row) is the natural
one to move into the phase-close instruments line, which would keep the count at 8.

### 4.3 F3 — C7 does not cover a non-configurable threshold state (plan gap)

Intention §2 (`raw_intention.md:99-101`) is explicit that `out_of_stock` and
`high_in_stock` "do not have independently configurable thresholds", and that
"invalid, duplicated, contradictory, missing, or unordered" configurations hard-fail.

C7 enumerates missing (a), duplicate (b), bad quantity (c), unordered (d,e) and valid (f).
It has **no row for a threshold carrying a non-configurable state**, and task 2's wording —
"all three configurable states present exactly once" — is satisfied by
`[low, medium, normal, high_in_stock]`. An implementer reading only the plan can
legitimately let that through; the reviewer, reading intention §2, will legitimately call
it a defect. That is a round spent on ambiguity.

Master plan §6.5 does say `CreateLocationStockInput` carries "exactly the three
configurable states" — but §6.5 is outside P1's Read-first list (see F4), and it is a
contract-layer statement about P3's zod schema, not about the P1 domain function.

**Proposed amendment:** add
`(g) a threshold whose state is out_of_stock or high_in_stock → hard-fail`
to C7, and change task 2 to "exactly the three configurable states, each present once and
no others".

### 4.4 F4 — the hard-fail error type is outside P1's read scope (plan gap)

C3(f) requires `normalizeCriteria` to "throw a validation error"; C7 requires
`validateThresholds` to hard-fail. Neither the plan nor **any section it tells the
implementer to read** names the class.

The decision exists in the artifact set, twice, and both places are excluded from P1's
Read-first (`plan_1_schema_domain.md:7`):

- `master_plan.md:169` (§6.5 — the plan reads §6.1–§6.4 and §6.6, skipping §6.5)
- `context/context.md:484` (§3.4 — the plan reads §0.x, §7.4–§7.5, §12.2–§12.3)

I confirmed the target exists and is safe for a pure domain module:
`ValidationError extends AppError` (`src/shared/errors/http-errors.ts:3-7`) has no Prisma
and no I/O import, so it does not break the §9.2 purity grep, and the architecture
contract explicitly endorses domain code throwing typed `AppError` subclasses.

**Proposed amendment:** append to the plan's Read-first — "master plan §6.5's error line
(domain hard-fails throw `ValidationError` from `shared/errors/http-errors.ts`)" — or
restate it in a Notes bullet. One line either way.

### 4.5 F5 — the verify script's row scope is ambiguous (plan gap)

Task 7 says "one PASS/FAIL line per criterion row below". Taken literally that is all
**51** rows, including C1(a)–(e), which are schema text and a migration run — C1(e) is
marked manual in the criterion itself. Master plan §9.1(b) scopes the script to
"enumerated **pure-domain** criteria", i.e. C2–C8 = **46** rows. The two sentences
disagree, and the reviewer re-runs this script and counts its lines.

Second, related: two rows pack several distinct inputs behind one expected outcome —
C3(f) (`{k:[]}` **and** `{k:["  "]}`) and C7(c) (zero, negative, **and** non-integer).
Under "one line per row" a script can check one input, print PASS, and leave the other
two unexercised while the ledger reads complete. That is charter rule 2's enumeration
requirement losing to the instrument's line budget.

**Proposed amendment:** task 7 reads "one PASS/FAIL line per **pure-domain** criterion row
(C2–C8, 46 rows); C1 is verified by inspection and the migration run, recorded in the
Review log" — and "a row carrying more than one input case emits one line per case, each
labelled with its row id (so C3(f) emits two lines and C7(c) three, for 49 lines total)."

### 4.6 F6 — one planted-defect probe for a 46-row instrument (plan gap)

`plan_1_schema_domain.md:39` prescribes exactly one probe: make `-` a separator, C2(e)
must FAIL. That is a good probe and it proves the harness can fail at all. It proves
nothing about the other 45 rows.

Charter rule 15 binds each guard, and rule 12 requires one mutation per sub-check,
enumerated from the code after it is written. This matters more here than usual for two
reasons: with no test runner, this script is the phase's **only** enumerated instrument,
so a row written as a tautology has nothing behind it; and P1 sets the pattern that P2–P6
will copy.

46 probes would be disproportionate. One per criterion group is cheap — each is a one-line
edit plus a re-run — and covers every mechanism the phase owns.

**Proposed amendment:** replace line 39's parenthetical with a named probe per group,
each stating the mutation, its site, and the row that must go FAIL:

| Probe | Mutation | Must turn FAIL |
|---|---|---|
| 1 | add `-` to the separator class in `tokenizePropertyValue` | C2(e) |
| 2 | drop the key sort in `canonicalCriteriaString` | C3(e) |
| 3 | let a wildcard match an item lacking the key in `matchesCriteria` | C4(d) |
| 4 | flip §0.13 rule 3 to "higher wins" in `specificityScore` | C5(d) |
| 5 | change the low-boundary test from `<=` to `<` in `calculateStockState` | C6(c) |
| 6 | remove the `low < medium` check from `validateThresholds` | C7(d) |
| 7 | require at least one key before reporting a conflict in `findConflict` | C8(g) |

Probe 7 is the one I would least want to lose: `{}` vs `{}` conflicts by **vacuous truth**
over an empty key set (intention §23.2 line 849 makes this explicit), and a hand-written
`if (keys.length === 0) return null` guard is the natural wrong instinct. C8(g) exists;
without a probe, nothing proves it can bite.

### 4.7 F7 — C1 traces to no measurement-ledger entry (trace gap)

Intention §24 (`raw_intention.md:892`) states: "Every phase acceptance criterion traces to
one of these IDs." C1's trace cell reads `§23.1, §0.2, §0.20` — three contract sections,
no `M` id. C2–C8 all carry one. Charter manifest property 5 and projection step 6 both
check this link.

The cited sections do support most of what C1 asserts (§23.1 grounds `propertiesCanonical`
as the identity behind C1(b); §0.2 grounds `shopId`; §0.20 grounds the enum), so this is a
thin trace rather than a void one. Two rows are ungrounded by any citation: C1(c)'s
`@@unique([locationStockId, state])` and C1(d)'s cascades — the latter is supported by
context §12.5, which the plan does not cite.

**Proposed amendment:** trace cell → `M6, M1, §23.1, §0.2, §0.20, §12.5`. M6 (conflict
prevention) is served by C1(b): the unique index on `propertiesCanonical` is the database's
half of the duplicate guard. M1 is served by the columns the allocator reads.

## 5. Reality checks — all passing

Recorded because a clean check is a result, and because two of these are load-bearing
claims that no one had yet verified against the tree.

1. **The registry's Prisma block compiles.** I reconstructed master plan §6.1 verbatim
   onto a copy of the live schema (adding the two `Shop` back-relations §6.1 requires) in
   a scratch directory and ran `prisma validate` (Prisma 6.19.3): **"The schema … is
   valid 🚀"**. Non-nullable `Json` on SQLite, the four-column unique, the composite index
   and all three cascades are accepted as written. No repo file was touched.
2. **The migration will be clean.** `Shop` gains only back-relation fields, which emit no
   SQL, so context §12.3's `RedefineTables` hazard does not apply — this is the "adding a
   new table with FKs is clean" case.
3. **C1(d)'s count is right.** §6.1 declares exactly three FK relations
   (`LocationStock→Shop`, `StockThresholdsLocation→Shop`, `StockThresholdsLocation→LocationStock`),
   all three `onDelete: Cascade`.
4. **Environment matches master plan §10.0.** `prisma migrate status` → 33 migrations,
   "Database schema is up to date!".
5. **`prisma/dev.db` is gitignored** (`.gitignore:12`), so running the migration does not
   dirty the declared file perimeter.
6. **The script invocation needs no `package.json` edit** — `scripts/` is inside
   `tsconfig.json`'s `include`, so `npm run typecheck` already covers
   `verify-stock-domain.ts`, and the repo convention is `npx tsx scripts/<name>.ts`
   (`scripts/reconcile-active-sold-items.ts:10-16`). `package.json` correctly stays out of
   the perimeter.
7. **Every path in "Files expected to change" resolves**: `prisma/schema.prisma` exists;
   the five new paths are absent (re-confirming the gate) and are marked new.
8. **Every citation in the Read-first list resolves** and says what the plan claims.
9. **The row count is derived, not typed**: C1–C8 carry 5+6+6+6+6+8+6+8 = **51** lettered
   rows, matching the dispatch prompt.
10. **Every worked example in the plan re-derives correctly.** C5(a)–(d) reproduce §0.13's
    verification table including the weight arithmetic in the parentheticals; C6's eight
    boundaries are exactly §3's five bands; C8(a)–(h) are the §23.2 consequence list plus
    the two empty-key-set cases.
11. **§0.13 rule 3 is well-defined even though a wildcard's "accepted value count" is
    never stated.** Rules 1 and 2 tying forces both candidates to have identical wildcard
    counts (weight = 2·valued + 1·wildcard, with valued equal), so whatever constant a
    wildcard contributes cancels. No amendment needed — recorded so the next reader does
    not re-open it.
12. **A `{}` vs `{}` collision cannot reach the allocator**: C8(g) rejects the second
    catch-all at configuration time, so C5(f)'s "loses to every other match" never has to
    break a tie against a peer.
13. **`properties Json` being non-nullable is stricter than §0.21 contemplates, and that
    is an improvement** — §0.21 hedges "`null`, if it is ever written at all"; the registry
    makes it unwritable, which removes the collapse hazard §0.21 exists to prevent.

## 6. Decidability pass — all 51 rows

Each row was tested against the project's remapped question (master plan §9.1): could the
implementer turn it into one concrete PASS/FAIL check with one exact expected outcome,
from the artifacts alone?

| Criterion | Rows | Result |
|---|---|---|
| C1 | a–e (5) | Decidable. (a)–(d) by diff against §6.1; (e) is the manual env-lifecycle run §9.1 permits. |
| C2 | a–f (6) | Decidable, all six concrete inputs → concrete token sets. |
| C3 | a–f (6) | (a)–(e) decidable. **(f) blocked on the error class — F4.** Note also (f) packs two inputs — F5. |
| C4 | a–f (6) | Decidable as written, **but every row depends on the parameter type F1 leaves open.** |
| C5 | a–f (6) | Decidable. (e)'s tie is reachable in production via two disjoint-key configs of equal weight, so the row is not hypothetical. |
| C6 | a–h (8) | Decidable, exhaustive over §3's bands. Silent on negative quantity — D2. |
| C7 | a–f (6) | Decidable. **Incomplete — F3.** (c) packs three inputs — F5. |
| C8 | a–h (8) | Decidable, including the vacuous-truth row (g). |

Reverse trace: P1 claims M1 (C2, C4, C5), M2 (C6) and M6 (C3, C7, C8). Each is served by
at least one row. P1 claims no ledger entry it does not serve. M3, M4, M5, M7, M8 belong to
later phases and are correctly absent.

## 7. Write perimeter

**Exactly one file, in the worktree, as expected of this role:**

- `docs/under_implementation/warehouse_stock/handoffs/reviewer/handoff_plan1_projection_0.md` (this file, created)

Nothing else was created or modified. No code was written. The master plan tracker and the
plan file's Review log were deliberately left untouched — they belong to the coordinator.

**Not mine, flagged so the diff is not misattributed:** `git status` also shows untracked
`docs/under_implementation/warehouse_stock/frontend_handoffs/frontend-report-endpoint-request.md`.
It appeared during this session (mtime 2026-09-01 19:16) and was written by another actor —
this session never opened that folder, which is outside its read scope in any case. The
repo's tracked tree is otherwise clean at `f519cff`.

**Outside the repository** (declared for falsifiability, per the README's perimeter rule):
one scratch file, `scratch-schema.prisma`, in this session's scratchpad under
`/private/tmp/claude-501/…`, used for reality check 1. It is not in any git tree.

**Commands run were read-only** — `git branch --show-current`, `grep`/`sed`/`ls`,
`npx prisma validate --schema <scratchpad>`, `npx prisma migrate status`. No migration was
applied, no database was written, `npm run typecheck` was not re-run (master plan §10.0's
baseline stamp stands on an unchanged tree; re-running it would be over-evidence).

## 8. Appendix — skeleton (NON-AUTHORITATIVE, do not forward to the implementer)

Retained only to make the findings auditable. This is a measurement of what the plan
determines, **not** guidance; if any of it reaches the implementer, this gate has turned
into a second planner.

The derivation stopped at exactly seven points, and those seven are §3's ledger:
`normalizeCriteria` reached the throw site with no error class (F4); `matchesCriteria`
reached its parameter list with no type (F1); `validateThresholds` reached its state-set
check with the extra-state case undecided (F3); `calculateStockState` reached `quantity < 0`
with no rule (D2); both sorts reached a comparator choice (D1); `findConflict` reached a
multi-sibling return (D3); and task 6 produced a file with nothing to check it against (F2).
Everything else — the schema, all four domain modules' control flow, the map's content —
derived without a choice, which is the plan working as intended.
