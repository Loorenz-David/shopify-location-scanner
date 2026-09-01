---
plan: 1
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — Plan 1 implementation (round 1)

## 0. Role, doctrine, workspace

You are the **implementer** for phase P1 of the stock-locations frontend build.

Read these two files first, by absolute path, and follow them as this session's doctrine.
They are plain markdown; nothing about them is Claude-specific.

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md` (the doctrine file routes you here)

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/` — relative paths below
are inside it unless they start with `src/` or name a root file.
**Your plan file:** `plans/plan_1_foundations.md`.

**The plan file is your task list and acceptance criteria. Where this prompt differs from
it, the plan file wins.**

## 1. Gate check — verify before anything else

Stop and report without implementing if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | `intention/raw_intention.md` line 3 begins `**Status: RATIFIED**` | the header |
| G2 | The master plan tracker row for **P1** reads state `PROJECTED` | `master_plan.md` §4 |
| G3 | P1 has no predecessor phase, so no APPROVED predecessor is required | `master_plan.md` §7 |
| G4 | `src/features/stock/` does not exist yet | `ls src/features/` |
| G5 | The master plan §6 registry contains a subsection headed **"The state union — exactly one literal-bearing home"**, and §9 contains rules **S4a** and **S7** | `master_plan.md` |
| G6 | `intention/raw_intention.md` contains a section **§4B** defining **MC1a** and **MC1b** | the intention |

G5 and G6 exist because this phase was amended after a projection round; if they are
absent you are looking at pre-amendment artifacts and must stop.

**Do not gate on a clean working tree.** `package.json`, `package-lock.json`, the intention
and the contract copy are all legitimately modified, and several planning folders are
untracked. That is the expected state of this repo.

## 2. Read order

1. `master_plan.md` — **§3** (division of labor; it decides whether you scaffold `ui/`),
   §5 (contract resolution), **§6** (the naming registry — signatures, the state union,
   endpoint paths, the flag read site, mock mutation semantics, test config), **§9**
   (standing rules S1–S7, incl. S2's scan input set and S4a's category list), **§10**
   (environment: what is already installed, the mock/live switch, test scopes)
2. `intention/raw_intention.md` §1–§2, §4, §4A (**MC1, MC11, MC12**), **§4B (MC1a, MC1b)**, §8
3. `plans/plan_1_foundations.md` — the whole file, **including its Review log**, which
   records the round-0 projection and what each amendment was for
4. `backend_handoff/frontend-api-contract.md` (**v1.2**) §1, §3, §4.1–§4.7
5. `context/frontend-architecture.md` §2, §4
6. `design_handoff/00-global/00-global.md` — the fifteen state hexes; they exist in no
   other artifact

**Pattern-authority rule:** the documents above teach you how to write code. Open existing
implementation files (`src/core/api-client/`, `src/features/analytics/`, …) only to learn
**what exists** — the `apiClient` surface, how a feature module is laid out — never to
rediscover a pattern the registry already fixes.

## 3. Hazards — not optional

This phase was projected before dispatch and the projection found **zero of six criterion
rows writable** as they then stood. Everything below is a defect that was live in the
artifacts you are about to read and has been repaired. They are listed so you do not
reintroduce them.

1. **The `/api` prefix doubles.** `VITE_API_BASE_URL` already ends in `/api`
   (`http://192.168.1.246:4000/api`) and `apiClient` prepends it. Of every endpoint literal
   in `src/`, **zero** begin with `/api`. So `GET /api/stock/options` in the contract is
   `apiClient.get("/stock/options")` in code. Writing the contract path verbatim yields
   `…/api/api/stock/options`, which **no mock-mode test can observe** and which first
   breaks nine phases later against a live backend. C5(b) asserts the resolved URL for this
   reason.
2. **The state-name guards collide with your own tests.** S2's scans forbid state names and
   hexes outside an allowlist, and your test files legitimately contain both. The scan input
   set therefore **excludes `**/*.test.ts(x)`** (master plan S2). Read that rule before
   writing C6; do not widen the allowlist to make a scan pass.
3. **`STOCK_STATES` order indices are not a scan subject.** Array position *is* the index;
   there is no numeric literal to find. Do not add a fourth scan.
4. **The comparator's two silent failures.** An unknown state resolves to `indexOf() === -1`
   and sorts **ahead of `out_of_stock`** — ranked more urgent than an empty shelf, silently.
   And a comparator returning a non-zero constant for equal states passes a five-distinct-
   state sort while destabilising every downstream chain. MC1a and MC1b close both; C2(d)
   and C2(f) are their tests, and the two named mutations are their proof.
5. **Stub mocks break the demo four phases from now.** The mock layer holds session state
   (master plan §6, "Mock mutation semantics"). A constant-returning stub satisfies C5(a)
   perfectly and makes a wizard-created definition vanish from the location detail that
   refetches a moment later.
6. **The test config must merge, not replace, `vite.config.ts`.** A standalone
   `vitest.config.ts` drops the react, tailwind and svgr plugins inside tests — invisible in
   P1, fatal from P5.

## 4. Scope fences — absolute

- **No domain logic beyond MC1/MC1a/MC1b.** Compaction, ordering, filters, criteria,
  thresholds and PDF assembly are phases 2, 3 and 8. If a type or helper feels like it
  wants them, stop.
- **No stores, no controllers, no actions, no flows.** That is phase 4.
- **No UI.** Per master plan §3 you own everything except `ui/`, and may create only empty
  scaffolding exports the registry names — if the registry names none for this phase,
  create none.
- **Do not edit** `tsconfig.app.json` (master plan §6's explicit-imports decision exists to
  keep it out of your perimeter), `vite.config.ts`, or `.env` (the owner has already set
  `VITE_STOCK_API_MODE=mock` there).
- **Do not run `npm install`.** Every test dependency is already present. Installing would
  bump versions and further dirty an already-modified `package-lock.json`.

If the plan appears to require crossing a fence, **stop and report** — do not decide.

## 5. Delegations — decisions granted to you on purpose

The round-0 projection identified these as genuine free choices. They are yours; they are
listed so your freedom here is granted rather than taken silently. Record what you chose in
the Review log.

- **`STOCK_STATES` shape** — a `readonly` tuple of state-name strings plus a separate
  `Record<StockState, StockStateMeta>`, per master plan §6. The internal shape of
  `StockStateMeta` beyond `{ label, text, tint, solid }` is yours.
- **jest-dom setup specifier** — `@testing-library/jest-dom/vitest` (the bare entry point
  augments jest's namespace, not vitest's).
- **The `quantity: 0` fixture entry** — `out_of_stock`, under a third `mergeKey` so it
  cannot disturb C3(b)/(c)'s exact counts.
- **Fixture location codes** — use the contract's own `LC1` and `H1` verbatim (S4). Note
  for the record: if the shop's bootstrap options do not contain these codes, the P5–P7
  demo will show a report and a wizard over disjoint location sets. Flag it if you see it;
  do not fix it here.
- **How the C6 scan reads files** — raw source text, case-insensitive for hex. The scan
  must be a pure function over an **injected file list** so the probes can pass synthetic
  files, and one further assertion must pin the shipped call site to the real list.

## 6. Evidence budget

**This session's L4 budget is exactly 1** — the closing stamp of charter closing-protocol
step 1, taken on the tree you actually hand over. Everything else runs at L1/L2 (master
plan §10 names the commands).

Two clarifications, both earned:

- If you change anything after taking the stamp, **re-take it**. The stamp is defined by
  the tree, not by the count; a re-stamp is not over-budget. Citing a stamp whose tree you
  then changed is the violation.
- The **five named mutations** (plan Notes: C2 2 · C6 3) are run at their own hypothesis
  scope, L1/L2 — they are not L4 runs and do not touch this budget.

Any additional L4 run requires the charter's authorization line — "narrower evidence
insufficient because …" — **written before the run** and recorded in the handoff.

This repo has **zero pre-existing tests**, so your run is the project's first baseline.
Enumerate it; there is nothing to diff against.

## 7. What you owe at close

Follow the executor's closing protocol exactly. Specific to this phase:

- **Task 0 first** — the row-by-row coverage map, before you edit production code. Note
  that this plan's rows have sub-rows: C2 has (a)–(f), C3 (a)–(d), C4 (a)–(b), C5 (a)–(e),
  C6 (a)–(c). **Each sub-row gets its own line**, with the test id that discharges it and
  whether the assertion is the shape the row specifies or something weaker. A cell you
  cannot fill is a finding you have just made — report it, never invent coverage.
- **Five named mutations, all run, none inspected.** `executed != declared` blocks
  IMPLEMENTED. C2's two are applied at the `compareByStateIndex` **definition** in
  `stock-states.domain.ts`, not at a call site. C6's three are one synthetic violating file
  per assertion. Record each as a full evidence record and revert it. If a probe comes back
  green where you expected red, suspect the siting before the finding — and if you re-site
  it, say so.
- **C1 is a charter rule-1 environment-lifecycle exemption**: record the three commands
  (`npm test`, `npm run typecheck`, `npm run lint`) with their output in the Review log.
- **Checkpoint commit** at IMPLEMENTED, subject prefixed `CHECKPOINT (not approved):`,
  under the pipeline's standing owner authorization — do not stop to ask.
- **Tracker row → IMPLEMENTED.** Touch no other row.
- **Handoff** at `handoffs/implementer/handoff_plan_1_implement_1.md` with the charter row
  schema, declaring your **full write perimeter** — every file you changed, plus every file
  a mutation probe touched, listed separately. The coordinator diffs this against the tree;
  an undeclared write is a finding whoever made it.
- No architecture graph in this repo (master plan §8) — skip that step silently.

Any question only the owner can settle goes in the handoff as a **decision card** in a
`⚠ OWNER DECISIONS REQUIRED (n)` section placed right after your opening summary — never
buried in the judgment-call log. If nothing needs the owner, say so in one line.

Your final chat message follows the charter's **owner layer**: *What I did → What I found
and what it means for you → What happens next → What needs you*, plus one pointer line to
the handoff. No section numbers or file paths in that layer, and never a paste of the
handoff.
