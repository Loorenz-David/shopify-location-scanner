---
plan: 5
role: review
round: 1
state: CLOSED
verdict: APPROVED
date: 2026-09-02
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P5 review (round 1) — APPROVED

Tree reviewed: **`dedf415`** (`CHECKPOINT (not approved): implement P5 stock report`), handoff
recorded at `1e0977c`. Perimeter `git diff --name-only b5800a3 HEAD` = exactly the six permitted
code/instrument files plus the two permitted pipeline artifacts. No blocking finding, no
should-fix, no fix cycle.

**This phase ran without a projection round (owner waiver, §3), so the review carried its
weight.** All 14 rows were re-executed, all three manual scenarios re-run against a live
server, and the instrument was probed with four independent mutations rather than trusted.

## ⚠ OWNER DECISIONS REQUIRED (0)

## How this phase was verified

| Instrument | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| purity grep | empty |
| `verify-all.ts` on scratch copy | **`SUMMARY PASS 3 script(s)`** — 58 P1 + 20 P2 + **14 P5**, all PASS |
| script refusal guard | exit **3** in all three forms: `DATABASE_URL` unset, `file:./dev.db`, and the absolute path |
| perimeter | exact; contract/controller/routes **additive only**, `verify-all.ts` limited to the `EXPECTED_SCRIPTS` line |
| plan file | append-only (Review log; no criterion edited) |
| `prisma/dev.db` | untouched — still 0 `LocationStock` rows and 1 `Shop` after a run that seeds a second shop |

### The code

Nineteen lines. `getStockReportQuery` calls P2's `listByShop(shopId)` and maps one entry per
row; `mergeKey` is `` `${itemCategory}|${propertiesCanonical}` `` **from the stored column**, as
§26.2 and the plan's first hazard require. No filter, no sort, no grouping, no compaction — the
four things §26.3 moved to the client are absent, which is the correct outcome, not an omission.
The controller ignores `req.query` entirely, so no 400 path for parameters can exist.

### Manual scenarios — reviewer re-execution, on real inventory

Live server on a scratch copy (port 4406), four definitions seeded through P3's own endpoint.

```
H1  | Dining Chairs | {"wood_type":["teak"]} | 107→ 34  high  | key: Dining Chairs|{"wood_type":["teak"]}
LC1 | Dining Chairs | {"wood_type":["teak"]} |     107  high  | key: Dining Chairs|{"wood_type":["teak"]}
LC1 | Dining Chairs | {}                     |     114  high  | key: Dining Chairs|{}
ZZ0 | Sofas         | {"wood_type":["oak"]}  |       0  out   | key: Sofas|{"wood_type":["oak"]}
```

- **C2(b) demonstrated on live data, not just in the fixture.** The LC1 row was created with the
  **scalar** `{"wood_type":"Teak"}` and the H1 row with the **array** `{"wood_type":["Teak"]}`.
  They came back with the **same `mergeKey`**. That is the whole point of the key.
- **C1(b) live:** the Sofas definition matches nothing and is present at `quantity: 0` /
  `out_of_stock`, not omitted.
- **C3(a) live:** entry keys are exactly `itemCategory, location, mergeKey, properties, quantity,
  stockState` — six, no more. **C3(b):** `properties` is canonical criteria (`["teak"]`,
  lowercased), never an item bag.
- **C3(c):** `?states=out_of_stock&groupByLocation=true&limit=1&sort=severity` returned a payload
  **byte-identical** to the unparameterized call (691 bytes, `cmp` clean). A deliberately
  malformed `?bogus=%%%&states=nonsense` also returned **200** — ignored, not rejected.
- **C3(d):** `/api/stock/report` and `/stock/report` both 200 with identical payloads; no token →
  **401**. Auth and both mounts come free from P3's router, as the lint predicted.

### Reviewer mutation probes — four, independent of the implementer's

| Mutation | Rows reddened |
|---|---|
| **M1** — the plan's named probe: stored column → `JSON.stringify(properties)` | **none** |
| **M2** — key omits `itemCategory` | C2(d), naming the collision |
| **M3** — key includes `location` | C2(a), C2(b), C2(e), C2(f) |
| **M4** — omit zero-quantity definitions | C1(a), C1(b), C1(c), C2(a)–(e) — 8 rows |

All reverted; tree verified clean. **No repository file was modified by this review.**

M2, M3 and M4 each failed with messages naming their own row's predicate — the
one-assertion-per-lettered-row rule (P2 review N1, folded into this plan) doing exactly the job
it was added for. Under M4 eight rows failed and each said something different and true.

## Findings

### N1 — note — the plan's named planted-defect probe cannot fail, and the implementer was right to say so

**Confirmed independently. This is a defect in my plan, not in the code.**

Plan 5's Notes name one probe: derive `mergeKey` from `JSON.stringify(properties)` instead of the
stored `propertiesCanonical` column, expecting **C2(b) to redden**. I applied that exact mutation:
**every row still passed.**

**Why.** Both derivations are provably identical for any data this system can hold.
`propertiesCanonical` is written as `canonicalCriteriaString(normalizeCriteria(input))`; the
domain `properties` is `normalizeCriteria(stored)`, and `normalizeCriteria` already emits keys in
sorted order with sorted, lowercased, de-duplicated values — so `JSON.stringify` of it *is* the
canonical string. Only two methods ever write the column (`createConfigurations`, `updateConfig`)
and both write it together with `properties`; reconciliation writes neither. There is no reachable
state where they diverge.

So the scalar/array unification C2(b) names is settled by P1's `normalizeCriteria` **at write
time**, upstream of anything P5 does. C2(b) is not *vacuous* — M3 reddened it — but it does not
discriminate the specific distinction its wording implies.

**The failure mode the probe was aimed at is nevertheless covered**, which is why this is a note
and not a blocker. The plan wanted protection against "a `mergeKey` that quietly splits or merges
the client's groups"; M2 proves the **merging** direction is caught (C2(d)) and M3 proves the
**splitting** direction is caught (C2(a)/(e)/(f)). The probe was mis-aimed, not the coverage.

**The implementer's handling was correct and is worth naming:** it ran the probe, observed the
false green, reported it as an instrument limitation, and did **not** weaken the contract, edit
P2 to manufacture a difference, or quietly substitute a different probe and call it the plan's.
Using the stored column remains right regardless — §26.2 specifies it and §21/§0.5 forbid a
second canonicalization implementation.

**Disposition:** recorded, no fix cycle (§9.7 — the code is correct and no later phase builds on
this probe). The transferable lesson is in *Lessons* below.

### N2 — note — C3(d) is half a source-text match

`verifyC3d` asserts with `routeSource.includes('stockRouter.get("/report", getStockReportController)')`
and two `serverSource.includes('app.use(...)')` string matches. That proves *registration text*,
not reachability, and it reddens on a harmless reformat. It is backed by the curl steps, which
prove reachability properly and which I re-executed on both mounts. Advisory; not worth changing
in an interim system.

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan5_review_1.md` (this file)
- `plans/plan_5_report.md` (Review log entry)
- `master_plan.md` (tracker row)

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| N1 | named probe cannot redden; C2(b) discriminates less than its wording implies | recorded; lesson folded into §9 | no |
| N2 | C3(d) partly a source-text match | recorded | no |
| — | `shopId` asymmetry (`applyIncrement`, `updateState`) | P6 sweep, one item | no |
| — | P2/P4 threshold-throw doctrine collision | P6 or an intention amendment | no |
| — | end-to-end runbook | P6 C3 | no |

## Lessons for the plans

1. **A planted-defect probe must be aimed at the boundary the phase owns.** This one targeted a
   derivation whose two forms are equal *before* the phase's code runs, so it could only ever
   produce a false green — and a false green from a probe is worse than no probe, because it is
   recorded as evidence that the instrument works. The test is: *can I name a reachable input for
   which the mutant and the original differ?* Had that question been asked when plan 5 was
   written, the probe would have become M2 or M3, both of which discriminate cleanly.
2. **This is the second instrument-design defect the implementer caught rather than the
   coordinator** (P3's was the contract's §4.4 example). Both surfaced through the handoff's
   "candidate upstream note" section. That section is earning its place in the prompt template
   and should stay in P6's.
3. **The waived projection cost something measurable and it is worth recording honestly.** A
   projection round writes a skeleton and would plausibly have asked "what input makes this
   mutant differ?" before implementation rather than after. The waiver was still the right call
   for a 19-line pure read — but the trade was real, not free.
