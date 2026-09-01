# P1 — Schema + Pure Domain Machinery

## Goal
Create the two tables and the `StockState` enum, and implement every pure domain rule (tokenization, canonical criteria form, matching, specificity, state calculation, threshold validation, conflict detection) plus the category-grouped property-options map. **Not in this phase:** any Prisma access beyond the migration, any HTTP surface, any hook into item flows.

## Read first
Master plan §5, §6.1–§6.4, §6.6, §9, §10 · intention §1–§6, §23.1–§23.3, §24 · context §0.5, §0.8, §0.13, §0.20, §0.21, §7.4–§7.5, §12.2–§12.3 · `.github/instructions/backend-contracts.instructions.md` · owner-answered `context/property-options-selection.md` · `src/shared/category/item-categories.ts` (the `as const` pattern to copy).

## Dependencies (gate)
Owner's property-key selection answered. Nothing else.

## Files expected to change
`prisma/schema.prisma` · `prisma/migrations/<ts>_add_location_stock/migration.sql` · new `src/modules/stock/domain/{stock-state,property-criteria,best-match,conflict}.ts` · new `src/shared/item-properties/item-property-options.ts` · new `scripts/verify-stock-domain.ts`.

## Tasks (ordered)
1. Schema + migration exactly per master plan §6.1 (including `Shop` back-relations). Run the migration on dev.db.
2. `stock-state.ts` — `STOCK_STATES`, `calculateStockState`, `validateThresholds` (all three configurable states present exactly once, positive integers, low < medium < normal; hard-fail otherwise — intention §2).
3. `property-criteria.ts` — `tokenizePropertyValue` (§0.5 verbatim: split `,` `/` `&`, trim, drop empties, lowercase), `normalizeCriteria` (§23.1), `canonicalCriteriaString` (key-sorted JSON of the canonical object), `matchesCriteria` (§0.5 set membership; §0.8 wildcard-requires-key; §0.21 `{}` matches everything; item `properties = null` matches only `{}`).
4. `best-match.ts` — §0.13 four-component ordered comparison; `resolveBestMatch` over candidates carrying `{id, createdAt, criteria}`.
5. `conflict.ts` — §23.2: same key set AND per-key intersection (wildcard intersects all) → conflict.
6. `item-property-options.ts` — §23.3 structure, content transcribed from the owner's selection sheet; `getPropertyOptionsForCategory`.
7. `scripts/verify-stock-domain.ts` — one PASS/FAIL line per criterion row below, exits non-zero on any FAIL (master plan §9.1b). Run it; paste output into the Review log.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Schema matches registry §6.1: (a) both models + enum field-for-field; (b) unique `[shopId, location, itemCategory, propertiesCanonical]`; (c) unique `[locationStockId, state]`; (d) `onDelete: Cascade` on all three FK relations; (e) migration applies cleanly to dev.db (env-lifecycle, manual — record in Review log) | §23.1, §0.2, §0.20 |
| C2 | Tokenization: (a) `"Teak, Beech"`→`{teak,beech}`; (b) `"Teak,Walnut"`→`{teak,walnut}`; (c) `"Oval/Rectangular"`→`{oval,rectangular}`; (d) `"Up & Down"`→`{up,down}`; (e) `"1-20 kg"`→`{1-20 kg}` (`-` never splits); (f) `"  Teak  "`→`{teak}` | M1, §0.5 |
| C3 | Canonical form: (a) `{wood_type:"Teak"}` ≡ `{wood_type:["Teak"]}` → identical canonical string; (b) `["Teak","teak","Oak"]`→`["oak","teak"]`; (c) `null` preserved; (d) `{}` canonicalizes to `"{}"`; (e) key order in input never changes the canonical string; (f) `{k:[]}` and `{k:["  "]}` throw a validation error | M6, §23.1 |
| C4 | Matching: (a) criterion `{wood_type:["teak"]}` matches stored `"Teak, Beech"`; (b) multi-value intersection: `{wood_type:["teak","mahogany"]}` matches `"Mahogany"`, not `"Oak"`; (c) `{upholstery:null}` matches any item WITH the key, (d) and fails any item WITHOUT it; (e) `{}` matches an item with `properties = null`; (f) a non-`{}` criterion never matches an item with `properties = null` | M1, §0.5/§0.8/§0.21 |
| C5 | Specificity (each row from an intention/§0.13 worked example): (a) `{up:"Up",wood:"Teak"}` beats `{up:null}` (weight 4>1); (b) `{up:["Up","Down"],wood:["Teak","Mahogany"]}` beats `{up:null}`; (c) `{up:"Up"}` beats `{up:null,wood:null}` (rule 2 after weight tie 2=2); (d) `{wood:["Teak"]}` beats `{wood:["Teak","Oak"]}` (rule 3); (e) full tie → earlier `createdAt` wins, then lower `id`; (f) `{}` scores 0 and loses to every other match | M1, §0.13 |
| C6 | State calculation at low=10, med=15, norm=20 — every boundary pair: (a) 0→out_of_stock; (b) 1→low; (c) 10→low; (d) 11→medium; (e) 15→medium; (f) 16→normal; (g) 20→normal; (h) 21→high | M2, §3 |
| C7 | Threshold validation hard-fails: (a) missing any of the three states; (b) duplicate state; (c) zero/negative/non-integer quantity; (d) low ≥ medium; (e) medium ≥ normal; (f) valid config passes | M6, §2 |
| C8 | Conflict rule: (a) exact duplicate → conflict; (b) `{up:"Up"}` vs `{up:null}` → conflict; (c) `{wood:["Teak"]}` vs `{wood:["Teak","Oak"]}` → conflict; (d) `{wood:["Teak","Beech"]}` vs `{wood:["Beech","Oak"]}` → conflict (overlap); (e) `{wood:["Teak"]}` vs `{wood:["Oak"]}` → NO conflict (disjoint); (f) `{up:null}` vs `{up:"Up",wood:"Teak"}` → NO conflict (different key set); (g) `{}` vs `{}` → conflict; (h) `{}` vs `{up:null}` → NO conflict | M6, §23.2 |

Plus phase-close instruments: `npm run typecheck` green; purity grep (master plan §9.2) empty; `scripts/verify-stock-domain.ts` all-PASS output in Review log.

## Manual scenarios
None beyond the verify script — this phase has no I/O behavior. Note for reviewers: the verify script IS the enumerated instrument; reviewer re-runs it and additionally probes one planted defect per charter rule 15 (e.g. temporarily make `-` a separator → C2(e) must FAIL; revert).

## Notes
- Copy the `ITEM_CATEGORIES` `as const` idiom for both `STOCK_STATES` and the options map.
- `matchesCriteria` compares lowercased criterion values against the token set; criteria arrive already canonical.
- Do NOT add a third hand-written TS union for `StockState` (§0.20).

## Review log
(append-only)
