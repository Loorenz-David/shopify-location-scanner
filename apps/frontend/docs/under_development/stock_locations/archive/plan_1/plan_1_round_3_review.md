---
plan: 1
role: reviewer
round: 3
date: 2026-09-01
---

# Session prompt — Plan 1, first review

## 0. Role and doctrine

You are the **reviewer** for phase P1, and this is its **first review** — full checklist
against the plan's criteria and the semantic authorities, not a delta re-review.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/plan-reviewer.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under review:** `plans/plan_1_foundations.md`

## 1. Gate check

| # | must hold | where |
|---|---|---|
| G1 | The intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Master plan tracker P1 reads `IMPLEMENTED` | `master_plan.md` §4 |
| G3 | Two implementer handoffs exist: `handoff_plan_1_implement_1.md` and `..._2.md` | `handoffs/implementer/` |
| G4 | No review handoff for round 3 exists yet | `handoffs/reviewer/` |
| G5 | `src/features/stock/api/mocks/get-stock-options.fixture.ts` holds **28** categories | the fixture |

Do not gate on a clean working tree; unrelated owner changes and untracked planning files
are expected.

## 2. History — what is settled, so you do not spend findings on it

**Round 0 was a projection**, not an implementation. It found 26 under-determined decisions
and judged zero of six criterion rows writable. All 26 were routed before dispatch: the
intention gained §4B (MC1a, MC1b), the master plan gained the state-union home, seven API
signatures, the `/api` prefix rule, the flag read site, mock mutation semantics and the test
config decisions, and every criterion row was rewritten. Its handoff is in `handoffs/reviewer/`.

**Round 1 implemented the phase.** The coordinator verified its perimeter, its five named
mutations, its test roster and its lint claim independently; all held.

**Round 2 was a coordinator amendment, not a fix cycle — there were no findings.** The
backend answered a question mid-flight and reissued the contract as **v1.3**: `itemCategories`
had been elided with a literal `...`, and the real list is **28** values, not the nine that had
been inferred. Master plan S4a and criterion C4(b) were amended and Codex updated the fixture
and that one test. **The category question is settled. Do not re-open it, and do not raise the
nine-value history as a finding against anyone** — the artifacts moved under a correct
implementation.

Also settled: **master plan S6 no longer requires `npm run lint` to pass outright.** This repo
carries 48 pre-existing errors and 14 warnings in unrelated files, independently verified, with
zero in any file this phase touched. The obligation is a clean phase perimeter and no growth in
those totals — verify that, not a green lint.

## 3. Read order

1. `plans/plan_1_foundations.md` — criteria and the full Review log
2. `master_plan.md` §3, §5, §6, §9, §10
3. `intention/raw_intention.md` §4A (MC1, MC11, MC12), **§4B (MC1a, MC1b)**, §8
4. `backend_handoff/frontend-api-contract.md` **v1.3** §1, §3, §4.1–§4.7
5. `design_handoff/00-global/00-global.md` — the fifteen hexes C2(b) asserts
6. Both implementer handoffs, then the code

## 4. Named probes — extracted from the implementer's own reports

These are specific things the two handoffs say, which a review should test rather than
accept. They are where this phase's residual risk actually sits.

1. **C4(b) has never been observed failing.** Round 2's handoff states plainly that its
   baseline was **green** — the old fixture and old assertion agreed, so no red baseline was
   possible. Honest reporting, and it leaves the row unproven. Plant the nine-value list back
   into the fixture, confirm C4(b) reddens, revert. If it does not redden, that is a blocking
   finding.
2. **All three C6 probes were planted in the same file** (`api/get-stock-options.api.ts`).
   Charter test-evidence doctrine says independent effort is spent on **variation**. Re-plant
   at a *different* site — a mock file, a type file — and confirm each assertion still bites.
   A scan accidentally keyed to one path passes the original probes exactly.
3. **The C6 scan changed mechanism mid-round-1**, from Node filesystem reads to a Vite raw
   glob, and the probes were re-run afterwards. Confirm the shipped call site
   (`realScanCallSiteUsesFeatureFiles`) genuinely enumerates every non-test feature file:
   add a new `.ts` file under `src/features/stock/`, confirm the scanned set grows, remove it.
   This is charter rule 15's fifth instance — a guard proven only over an injected list, whose
   production call site feeds it something narrower, is a green light wired to nothing.
4. **C5(b) claims "resolved non-api-prefixed path".** Check what the assertion actually
   inspects. If it examines the argument handed to `apiClient` rather than the URL that
   `buildRequestUrl` resolves, the doubled-prefix defect it exists to catch can still pass.
   This was round 0's highest-severity finding; it deserves the deep pass.
5. **MC1a's boundary decision.** The contract puts unknown-state validation at the two domain
   entry points and **explicitly not** at the `api/` layer. Confirm the api layer does not
   quietly validate as well (a second site makes the "one interpretation site" contract false
   and changes where errors surface for P4).
6. **Mock session state and test isolation.** `__resetMockState()` exists. Confirm the tests
   actually call it and that the suite is order-independent — run the API test file alone and
   in the full suite, and check C5(e) cannot leak into C3/C4's fixture reads.
7. **C3(b)'s opaque key** is an implementer-chosen string, `report-walnut-chairs`, which is
   correct per S4's scope clause. Confirm nothing parses or derives meaning from it (contract
   §4.7: `mergeKey` is opaque and must never be parsed).

## 5. Evidence budget

**This session's L4 budget is exactly 1** — a stamp at review entry, because the tree will
have moved since the implementer's last recorded stamp (commits and planning-document changes).
Take it once, record tree identity, and cite it thereafter.

Everything else — every probe in §4 — runs at **L1/L2**. The probes are variation, which is
what independent review effort is for; re-running the implementer's identical commands on an
identical tree is a finding against you, not diligence.

Any further L4 needs the charter's authorization line written **before** the run.

Reference: 32 tests across 3 files, all passing; lint 48 errors / 14 warnings, all
pre-existing and outside the phase perimeter.

## 6. What to check, beyond the probes

Full first-review checklist per the reviewer doctrine, plus this phase's specifics:

- **Every criterion sub-row** — C2(a)–(f), C3(a)–(d), C4(a)–(b), C5(a)–(e), C6(a)–(c) — has a
  test whose assertion is the shape the row specifies, not something weaker. The row is the
  unit, not the criterion.
- **Standing rules** S1 (no UI), S2 (allowlists), S3 (one flag read site), S4/S4a/S4b
  (fixtures), S6 (lint baseline), S7 (C1's exemption).
- **Scope fences** — no domain logic beyond MC1/MC1a/MC1b, no stores, controllers, flows or UI.
- **Registry conformance** — the seven API signatures, the state-union home, `STOCK_STATES` as
  a readonly tuple, the derived `StockState` alias carrying no literals.
- **Orphan tests** — the coordinator enumerated 32 and found every one carries a criterion id;
  confirm independently and report any test that discharges no row.

## 7. Closing

Handoff at `handoffs/reviewer/plan_1_round_3_review_handoff.md`, charter row schema with
`verdict: APPROVED` or `CHANGES_REQUESTED`. Body: owner-readable opening, then
`⚠ OWNER DECISIONS REQUIRED (n)`, then findings by severity with the exact artifact and line,
then lessons for the plans, then your full write perimeter.

Findings are routed by severity; each blocking finding states the **correction** precisely
enough that a fix session can act on it without re-deriving your reasoning.

Do not edit the plan, the code, or the master plan — you report, the coordinator routes. Write
no Review log line; the coordinator writes it when consuming your handoff.

Final chat message in the charter's **owner layer**.
