# P1 — Schema + Pure Domain Machinery

## Goal
Create the two tables and the `StockState` enum, and implement every pure domain rule (tokenization, canonical criteria form, matching, specificity, state calculation, threshold validation, conflict detection) plus the category-grouped property-options map. **Not in this phase:** any Prisma access beyond the migration, any HTTP surface, any hook into item flows.

## Read first
Master plan §5, §6.1–§6.4, §6.6, §9, §10 · intention §1–§6, §23.1–§23.3, §24 · context §0.5, §0.8, §0.13, §0.20, §0.21, §7.4–§7.5, §12.2–§12.3 · `.github/instructions/backend-contracts.instructions.md` · owner-answered `context/property-options-selection.md` · `src/shared/category/item-categories.ts` (the `as const` pattern to copy) · **master plan §6.5's error line and context §3.4** — domain hard-fails throw `ValidationError` from `src/shared/errors/http-errors.ts` (verified pure: its only import is `AppError`, so it does not break the §9.2 purity grep, and the architecture contract endorses domain code throwing typed `AppError` subclasses).

## Dependencies (gate)
Owner's property-key selection answered. Nothing else.

## Files expected to change
`prisma/schema.prisma` · `prisma/migrations/<ts>_add_location_stock/migration.sql` · new `src/modules/stock/domain/{stock-state,property-criteria,best-match,conflict}.ts` · new `src/shared/item-properties/item-property-options.ts` · new `scripts/verify-stock-domain.ts`.

## Tasks (ordered)
1. Schema + migration exactly per master plan §6.1 (including `Shop` back-relations). Run the migration on dev.db.
2. `stock-state.ts` — `STOCK_STATES`, `calculateStockState`, `validateThresholds` (**exactly the three configurable states, each present once and no others** — a threshold naming `out_of_stock` or `high_in_stock` hard-fails, intention §2; positive integers; low < medium < normal; hard-fail otherwise).
3. `property-criteria.ts` — `tokenizePropertyValue` (§0.5 verbatim: split `,` `/` `&`, trim, drop empties, lowercase), `normalizeCriteria` (§23.1), `canonicalCriteriaString` (key-sorted JSON of the canonical object), `matchesCriteria` (§0.5 set membership; §0.8 wildcard-requires-key; §0.21 `{}` matches everything; item `properties = null` matches only `{}`).
4. `best-match.ts` — §0.13 four-component ordered comparison; `resolveBestMatch` over candidates carrying `{id, createdAt, criteria}`.
5. `conflict.ts` — §23.2: same key set AND per-key intersection (wildcard intersects all) → conflict.
6. `item-property-options.ts` — §23.3 structure, content transcribed from the owner's selection sheet; `getPropertyOptionsForCategory`.
7. `scripts/verify-stock-domain.ts` — one PASS/FAIL line per **pure-domain** criterion row (C2–C9; C1 is schema text and a migration run, verified by inspection and recorded in the Review log per master plan §9.1b). **A row carrying more than one input case emits one line per case, each labelled with its row id** — so C3(f) emits two lines and C7(c) three. Expected line count, derived not typed (`grep '^| C[2-9]' plan_1_schema_domain.md | grep -o '(\([a-h]\))' | wc -l` → 55): **55** pure-domain rows across C2–C9, plus 3 extra lines for the two packed rows (C3(f) +1, C7(c) +2) = **58**. Exits non-zero on any FAIL. Run it; paste output into the Review log.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Schema matches registry §6.1: (a) both models + enum field-for-field; (b) unique `[shopId, location, itemCategory, propertiesCanonical]`; (c) unique `[locationStockId, state]`; (d) `onDelete: Cascade` on all three FK relations; (e) migration applies cleanly to dev.db (env-lifecycle, manual — record in Review log) | M6, M1, §23.1, §0.2, §0.20, §12.5 |
| C2 | Tokenization: (a) `"Teak, Beech"`→`{teak,beech}`; (b) `"Teak,Walnut"`→`{teak,walnut}`; (c) `"Oval/Rectangular"`→`{oval,rectangular}`; (d) `"Up & Down"`→`{up,down}`; (e) `"1-20 kg"`→`{1-20 kg}` (`-` never splits); (f) `"  Teak  "`→`{teak}` | M1, §0.5 |
| C3 | Canonical form: (a) `{wood_type:"Teak"}` ≡ `{wood_type:["Teak"]}` → identical canonical string; (b) `["Teak","teak","Oak"]`→`["oak","teak"]`; (c) `null` preserved; (d) `{}` canonicalizes to `"{}"`; (e) key order in input never changes the canonical string; (f) `{k:[]}` and `{k:["  "]}` throw a validation error | M6, §23.1 |
| C4 | Matching: (a) criterion `{wood_type:["teak"]}` matches stored `"Teak, Beech"`; (b) multi-value intersection: `{wood_type:["teak","mahogany"]}` matches `"Mahogany"`, not `"Oak"`; (c) `{upholstery:null}` matches any item WITH the key, (d) and fails any item WITHOUT it; (e) `{}` matches an item with `properties = null`; (f) a non-`{}` criterion never matches an item with `properties = null` | M1, §0.5/§0.8/§0.21 |
| C5 | Specificity (each row from an intention/§0.13 worked example): (a) `{up:"Up",wood:"Teak"}` beats `{up:null}` (weight 4>1); (b) `{up:["Up","Down"],wood:["Teak","Mahogany"]}` beats `{up:null}`; (c) `{up:"Up"}` beats `{up:null,wood:null}` (rule 2 after weight tie 2=2); (d) `{wood:["Teak"]}` beats `{wood:["Teak","Oak"]}` (rule 3); (e) full tie → earlier `createdAt` wins, then lower `id`; (f) `{}` scores 0 and loses to every other match | M1, §0.13 |
| C6 | State calculation at low=10, med=15, norm=20 — every boundary pair: (a) 0→out_of_stock; (b) 1→low; (c) 10→low; (d) 11→medium; (e) 15→medium; (f) 16→normal; (g) 20→normal; (h) 21→high | M2, §3 |
| C7 | Threshold validation hard-fails: (a) missing any of the three states; (b) duplicate state; (c) zero/negative/non-integer quantity; (d) low ≥ medium; (e) medium ≥ normal; (f) valid config passes; (g) a threshold whose state is `out_of_stock` or `high_in_stock` → hard-fail (intention §2: those are derived, not configurable) | M6, §2 |
| C8 | Conflict rule: (a) exact duplicate → conflict; (b) `{up:"Up"}` vs `{up:null}` → conflict; (c) `{wood:["Teak"]}` vs `{wood:["Teak","Oak"]}` → conflict; (d) `{wood:["Teak","Beech"]}` vs `{wood:["Beech","Oak"]}` → conflict (overlap); (e) `{wood:["Teak"]}` vs `{wood:["Oak"]}` → NO conflict (disjoint); (f) `{up:null}` vs `{up:"Up",wood:"Teak"}` → NO conflict (different key set); (g) `{}` vs `{}` → conflict; (h) `{}` vs `{up:null}` → NO conflict | M6, §23.2 |
| C9 | Options map (transcription of the owner's FINAL table — the §0.4 validation whitelist, so a mistranscription IS the silent "matches zero items forever" failure): (a) exactly the 8 keys of that table, no others; (b) each key's value list matches it exactly, in that order; (c) `wood_type`, `years`, `weight_definition`, `country` are `"universal"`; (d) `shape`, `extension_type`, `extension_quantity` list exactly the six Table categories; (e) `upholstery` lists exactly the three Chair categories; (f) `getPropertyOptionsForCategory("Sofas")` → the 4 universal entries only; (g) `getPropertyOptionsForCategory("Dining Tables")` → those 4 plus `shape`, `extension_type`, `extension_quantity`; (h) `getPropertyOptionsForCategory("Dining Chairs")` → those 4 plus `upholstery` | M1, §23.3, `property-options-selection.md` §OWNER SELECTION |

Plus phase-close instruments: `npm run typecheck` green; purity grep (master plan §9.2) empty; `scripts/verify-stock-domain.ts` all-PASS output in Review log.

## Manual scenarios
None beyond the verify script — this phase has no I/O behavior.

**Reviewer planted-defect probes — one per criterion group (P1 projection F6).** With no
test runner this script is the phase's only enumerated instrument, and a single probe proves
the harness can fail at all while proving nothing about the other 45 rows. Charter rule 15
binds each guard; rule 12 requires one mutation per sub-check. Eight probes is cheap — each
is a one-line edit plus a re-run. The reviewer plants each, observes the named row go FAIL,
and reverts:

| Probe | Mutation | Must turn FAIL |
|---|---|---|
| 1 | add `-` to the separator class in `tokenizePropertyValue` | C2(e) |
| 2 | drop the key sort in `canonicalCriteriaString` | C3(e) |
| 3 | let a wildcard match an item lacking the key in `matchesCriteria` | C4(d) |
| 4 | flip §0.13 rule 3 to "higher wins" in `specificityScore` | C5(d) |
| 5 | change the low-boundary test from `<=` to `<` in `calculateStockState` | C6(c) |
| 6 | remove the `low < medium` check from `validateThresholds` | C7(d) |
| 7 | require at least one key before reporting a conflict in `findConflict` | C8(g) |
| 8 | drop one value from `wood_type`'s list in the options map | C9(b) |

Probe 7 is the one least worth losing: `{}` vs `{}` conflicts by **vacuous truth** over an
empty key set (intention §23.2), and a hand-written `if (keys.length === 0) return null`
guard is the natural wrong instinct. C8(g) exists; without the probe nothing proves it bites.

## Notes
- Copy the `ITEM_CATEGORIES` `as const` idiom for both `STOCK_STATES` and the options map.
- `matchesCriteria` compares lowercased criterion values against the token set; criteria arrive already canonical.
- Do NOT add a third hand-written TS union for `StockState` (§0.20).
- **Granted delegations (P1 projection D1–D5) — these are the implementer's call, on purpose, and are not review findings:** (D1) the comparator for "sorted lexicographically" on keys and values — use code-unit `.sort()`, **never** `localeCompare`, whose locale sensitivity would make the canonical string environment-dependent; (D2) `calculateStockState` outside its validated domain — `quantity <= 0 → out_of_stock`, and well-formed thresholds are a precondition (`validateThresholds` owns the rejection); (D3) which id `findConflict` returns when several siblings conflict — first match in input order; (D4) an item property present but tokenizing to the empty set (e.g. `""`) is treated as key-absent, so a wildcard does not match it — consistent with the §6.2 input-type reduction; (D5) the return shape of `specificityScore` — tuple or object, implementer's choice, provided ordered comparison is preserved (a single summed number is **not** acceptable: it collapses C5(c), where a weight tie of 2 = 2 must be broken by valued-key count).

## Review log
(append-only)

### 2026-09-01 — projection round 0 · AMENDMENTS_REQUIRED · consumed by coordinator

Handoff: `handoffs/reviewer/handoff_plan1_projection_0.md` (Claude Opus 5, fresh session,
per master plan §3). Seven findings, all plan-local — none reached the intention, and the
owner-decisions section was empty. All seven are folded as of this entry:

| # | Finding | Folded to |
|---|---|---|
| F1 | `matchesCriteria`'s item-properties parameter untyped in a section declared "fixed"; two incompatible candidate types exist in the tree | master plan §6.2 (+ §6.4 mirror) — `Record<string, string> \| null`, caller reduces |
| F2 | the options map and its accessor shipped with no acceptance criterion at all | this plan, **C9** |
| F3 | `validateThresholds` undecided on a non-configurable state; task 2's wording admits `high_in_stock` | this plan, **C7(g)** + task 2 |
| F4 | the hard-fail error class named nowhere in P1's read scope | this plan, Read-first |
| F5 | verify script's row scope ambiguous (51 vs 46); two rows pack multiple inputs behind one line | this plan, task 7 |
| F6 | one planted-defect probe for a 46-row instrument | this plan, Manual scenarios — 8 probes |
| F7 | C1 traced to no measurement-ledger ID, which intention §24 requires of every criterion | this plan, C1 trace cell |

Five further points (D1–D5) were genuine implementer freedom and are recorded as **granted
delegations** in Notes, so the freedom is given deliberately rather than taken silently.

**Coordinator's adversarial consumption.** Every load-bearing claim was re-checked against
the tree before folding: `ValidationError`'s only import is `AppError` (purity holds);
`ItemProperties = Record<string, string>` at `item-properties.ts:7` and
`Record<string, unknown> \| null` in the scanner domain both exist as described;
`normalizeStoredProperties` is a non-exported `const`; `dev.db` is gitignored;
`tsconfig.json` includes `scripts`; §6.1 declares exactly three cascading FK relations.
Arithmetic reconciles at the projected tree: 5+6+6+6+6+8+6+8 = 51, and 51 − 5 = 46 pure-domain rows.
**After this fold the plan is larger and those numbers are stale**: C7 gained (g) and C9 added
8 rows, so the plan now carries 60 lettered rows, 55 of them pure-domain (C2–C9), and task 7's
expected line count is 58. Recorded because the first draft of this fold copied the handoff's
"46" forward into task 7 — the underived-count trap the charter names, caught by re-running the
count against the amended file rather than trusting the number that had just been verified. The declared
write perimeter (one file) matches the tree, and the handoff correctly pre-attributed the
untracked `frontend_handoffs/` file to another actor — mtime 19:16:47 against its own
19:17:05, which checks out.

**One correction to the handoff.** F2 offered to hold the criteria count at 8 by moving
C1(e) into the phase-close instruments. That does not achieve it — C1 remains a criterion
whether or not it keeps row (e), so the count is 9 either way. Recorded rather than
silently fixed, because the reasoning behind the offer was sound even though the arithmetic
was not.

**Sizing exception, recorded per the charter (which permits >8 with a reason in the master
plan).** P1 now carries **9 criteria**. Accepted rather than split: every row is a pure
function checked by one committed script, with no I/O, no manual scenarios and no
environment dependency, so the criteria-count-to-rounds mechanism the charter's target
guards against does not apply the way it does to an I/O phase. Splitting the options map
into its own phase would also break P3's gate, which depends on it. The alternative —
shipping the §0.4 validation whitelist with nothing checking its transcription — is the
worse trade.

**Seal scored, then deleted.** Two probes were sealed outside the repo before dispatch.
**Both surfaced**: probe A (`specificityScore`'s return shape undetermined) as D5, probe B
(task 7 vs C1 disagreeing on verify-script scope) as F5. Per the seal's own rule, both
surfacing means the projection gate is earning its round on this project — it stays
**mandatory for P2 and P4** as master plan §3 already provides.

### 2026-09-01 — implement round 1 · IMPLEMENTED · Codex

Implemented the P1 schema, migration, pure stock domain machinery, owner-selected property
options map, and the committed domain verification script. The schema adds the `StockState`
enum, `LocationStock`, `StockThresholdsLocation`, the two `Shop` back-relations, the required
unique constraints and indexes, and cascading foreign keys. The migration
`20260901180407_add_location_stock` applied successfully to the worktree's `prisma/dev.db`;
the configured database was left at migration head and is gitignored.

The domain modules implement canonical criteria normalization, tokenized matching, ordered
specificity comparison, conflict detection, threshold validation/state calculation, and the
exact eight-entry property-options map from the owner's final selection. `verify-stock-domain.ts`
contains 58 executable case lines for the 55 pure-domain criterion rows, expanding C3(f) to
two cases and C7(c) to three. Its pre-edit baseline was 58 FAIL / 0 PASS / exit 1 because the
phase modules did not yet exist. The final code-tree checks were: `npm run typecheck` exit 0,
the purity grep empty, and the verifier all-PASS / exit 0. All eight plan-named mutation probes
were executed and reverted; each turned its named criterion row FAIL.

Judgment calls were the five granted delegations: D1 uses code-unit `.sort()` for canonical
keys and values; D2 keeps `quantity <= 0` in `out_of_stock` while `calculateStockState` validates
its threshold precondition; D3 returns the first conflicting sibling; D4 treats a present item
property that tokenizes to an empty set as key-absent; D5 returns a three-component tuple from
`specificityScore`, preserving ordered comparison rather than summing components. No contract
deviations or candidate criteria were found.

Checkpoint: `afed53a6b178de4b9890d56eeb760d4cb2bcb96e` (`CHECKPOINT (not approved): implement P1 schema and stock domain`).
The coordinator must consume the handoff, update the P1 tracker state, and dispatch the one
review session. Full verification output follows:

```text
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C2(d)
PASS C2(e)
PASS C2(f)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C3(e)
PASS C3(f) (empty array)
PASS C3(f) (blank scalar)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
PASS C4(f)
PASS C5(a)
PASS C5(b)
PASS C5(c)
PASS C5(d)
PASS C5(e)
PASS C5(f)
PASS C6(a)
PASS C6(b)
PASS C6(c)
PASS C6(d)
PASS C6(e)
PASS C6(f)
PASS C6(g)
PASS C6(h)
PASS C7(a)
PASS C7(b)
PASS C7(c) (zero)
PASS C7(c) (negative)
PASS C7(c) (non-integer)
PASS C7(d)
PASS C7(e)
PASS C7(f)
PASS C7(g)
PASS C8(a)
PASS C8(b)
PASS C8(c)
PASS C8(d)
PASS C8(e)
PASS C8(f)
PASS C8(g)
PASS C8(h)
PASS C9(a)
PASS C9(b)
PASS C9(c)
PASS C9(d)
PASS C9(e)
PASS C9(f)
PASS C9(g)
PASS C9(h)
```

### 2026-09-01 — review round 1 · APPROVED · Claude Opus (single-reviewer flow, intention §25)

Tree `afed53a`. Handoff: `handoffs/reviewer/handoff_plan1_review_1.md`.

**Instruments, re-run on the handed-over tree:** `npm run typecheck` exit 0 · purity grep empty
· `npx tsx scripts/verify-stock-domain.ts` **58 PASS / 0 FAIL / exit 0** (matches the derived
expectation) · `git diff --name-only 7b127ab afed53a` = exactly the eight-file perimeter.

**No blocking findings** (§11.2). Every criterion row re-derived against the code holds. C1
verified at source: schema matches §6.1 field-for-field, migration creates two tables plus four
indexes and three cascading FKs and touches no existing table (`RedefineTables` hazard N/A),
`migrate status` at head with 34 migrations. Options map verified **against the owner's FINAL
table**, not against the script's fixture: 8 keys, all values, both category groups exact.
No orphan cases; all 58 carry a row id.

| # | Sev | Finding |
|---|---|---|
| S1 | should-fix | C8 has no same-key-set pair with >1 key, so §23.2's conjunction ("on **every** key") is untested. Proven: `.every(` → `.slice(0,1).every(` in `findConflict` leaves 58/58 green. Correction: add C8(i) multi-key partial intersection → NO conflict, C8(j) full intersection → conflict, plus verify cases. |
| S2 | should-fix | Delegation D4's `itemTokens.size === 0` guard has no row. Proven: deleting it leaves 58/58 green. Correction: add C4(g) — a value tokenizing to the empty set does not satisfy a wildcard. |
| N1 | note | C9 compares the map to `expectedOptions`, a hand-copy in the same file (charter rule 15's snapshot-writes-its-own-baseline shape). Catches later divergence, not original mistranscription. Transcription independently verified correct — no defect today. |
| N2 | note | **Forward hazard, P3:** map values are display-cased, `normalizeCriteria` lowercases. §0.5 settles it ("comparison lowercases both sides") but P3's C1(b) does not cite it. |
| N3 | note | **Forward hazard, P2/P5:** `canonicalCriteriaString` sorts keys but not values and assumes normalized input. P2's `propertiesCanonical` and P5's `mergeKey` both rest on it, so P2's `toDomain` normalization is load-bearing, not defensive. |
| N4 | note | C7(a) trips the length guard before any per-state logic; `validateThresholds`' all-present check is unreachable by pigeonhole. No defect. |

**Reviewer probes:** R1/R2 above, applied and reverted, checksums verified identical
(`26c5c3b3…`, `921e540c…`). No DB or state side effects. The implementer's eight declared probes
were **consumed by citation, not re-run** — tree-bound to the reviewed tree per the charter's
test-evidence section; the budget went to variation instead, which is what produced S1 and S2.

**Owner decision open:** one short fix cycle to close S1+S2 (two rows, two verify cases, no
production change) versus carrying them forward. Card in the review handoff.

### 2026-09-01 — owner disposition of round 1 · phase CLOSED

**S1 and S2 closed as notes; no fix cycle.** Owner's reasoning, accepted and now standing law
as master plan **§9.7**: the code is verified correct, later phases *use* this code but never
edit it, and this backend is an interim system pending a rebuild. The bar is correct now, not
durable later.

The reviewer's own check confirms the premise rather than merely deferring to it: **no phase
P2–P6 lists `stock/domain/`, `item-property-options.ts` or `verify-stock-domain.ts` in its
"Files expected to change"** — zero occurrences — and every phase close diffs
`git diff --name-only` against that list with anything outside an automatic finding. So the
regression S1 and S2 guard against can only arrive through a perimeter violation that a
stronger, earlier mechanism already blocks. Coverage on frozen code buys nothing here.

**N2 and N3 were folded immediately** and are a different category — forward hazards in work
not yet written, where a plan edit costs nothing: N2 into plan 3 (task 1 and a new C1(b2): the
options map holds display casing, `normalizeCriteria` lowercases, so whitelist comparison must
lowercase both sides per §0.5 — otherwise every legal value is rejected); N3 into plan 2's
Notes (`canonicalCriteriaString` sorts keys but not values and assumes normalized input, so
`toDomain`'s normalization is load-bearing for both `propertiesCanonical` and P5's `mergeKey`).

N1 and N4 stand as recorded, no action.

**Phase 1 is APPROVED and closed.** Session artifacts archived to `archive/plan_1/`.

