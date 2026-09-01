---
plan: 1
role: projection
round: 0
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: Claude (Opus 5), projection session
---

# Plan 1 projection — round 0

## Opening (owner-readable)

I did the first hour of Plan 1 on paper, from the plan and the documents it points at,
and the plan is not yet safe to hand to an implementer. The single most serious thing I
found is a mismatch about web addresses: the plan tells the implementer to call the
backend using addresses that would come out doubled at runtime, and one of the plan's own
tests would lock that mistake in as if it were correct — it would pass every test now and
break only at the very last phase. I also found that the phase's three "safety scans" —
guards that are supposed to prove nobody has copied a colour or a state name where it
doesn't belong — cannot pass, because the phase's own test files legitimately contain
exactly the things the scans forbid. Twenty-six decisions in total are left undetermined
by the documents; each is listed below with where it should be fixed. Two of them need
you personally: how the app should reach its demo data when you run it, and which item
categories that demo data should offer. Everything else is a paragraph change the
coordinator can make before compiling the implementer's prompt.

## ⚠ OWNER DECISIONS REQUIRED (2)

### Card 1 — How should the app reach its demo data?

**Question:** When someone runs the app in development, should it use the built-in demo
data by default, or keep pointing at the real backend that does not exist yet?

**Story:** The whole stock feature is being built against demo data — the real endpoints
are not written and will not exist for two more backend phases. But the switch that
chooses demo data is shipped turned off, and no document anywhere says how to turn it on.
So today, starting the app and opening Stock report would show an error, not a report.
That matters at the four upcoming screen phases, where you approve each design by looking
at the running app.

**Branches:**
- **A)** Add a `dev:mock` start command that runs the app on demo data; the shipped build
  still points at the real backend. One command to remember, nothing else changes.
- **B)** Make demo data the default until the backend is live, then flip it. Nothing to
  remember, but a release made before the flip would ship demo data.
- **C)** Leave it and set the switch by hand in a local file. No code change; easy to
  forget, and that file is not shared between machines.

**Recommendation:** A — you get a working demo in one command, and the shipped default
still points at the real backend, which is what the safety rule behind this setting asks
for.

**On silence:** the gate holds. Plan 1 would ship a switch whose demo side nothing
reaches, and the first screen phase discovers it.

**Trace:** intention §4A MC11; master plan §10; plan 1 Task 4, C5; charter rule 10.

### Card 2 — Which item categories should the demo data offer?

**Question:** Should the demo data offer the nine item categories we can actually see
written down, or will you give us the full list?

**Story:** The configuration wizard makes you pick an item type before anything else, so
the demo data has to contain that list. The backend's vocabulary document spells out every
property value in full but leaves the item-type list unfinished, ending in "…". The only
complete names visible anywhere are six table types and three chair types, mentioned in
passing. If we guess, every wizard screen you review for the next several weeks shows a
category list you never chose, and the real backend may later disagree with it.

**Branches:**
- **A)** Use the nine names already visible. Faithful to what is written; possibly short.
- **B)** You give the full list now. The demo matches reality; costs you a few minutes.
- **C)** Ask the backend track to complete the list. Most authoritative; waits on another
  team.

**Recommendation:** B if the list is at hand, otherwise A with a note to revisit it before
the wizard phase.

**On silence:** the gate holds. The demo vocabulary stays undecided and the wizard phase
inherits it.

**Trace:** contract v1.2 §4.1 (line 48); master plan §9 S4; plan 1 C4.

## Decision ledger

Twenty-six points where the artifacts do not determine the implementer's next decision.

| # | decision point | classification | proposed routing |
|---|---|---|---|
| L1 | Endpoint string passed to `apiClient`: `/stock/...` (repo convention) vs the contract's `/api/stock/...` | plan gap | Amend plan Task 4 and C5(b)(d) to say "contract §4 path **minus** the `/api` prefix, which lives in `VITE_API_BASE_URL`"; amend `context/frontend-architecture.md` §4 (L76) and master plan §10 (L222–223); amend plan 10 Task 1. See F1. |
| L2 | Whether the C6 scans read the phase's own test files | plan gap | Amend C6 to define its scan input set explicitly (recommend: exclude `**/*.test.ts(x)`, and say so). Without this all three assertions fail on the tree P1 must produce. See F2. |
| L3 | C6 scan mechanism: raw source text vs AST; hex case-sensitivity; file glob; which extensions | plan gap | Amend C6 with the scan's exact definition. Recommend: raw text, case-insensitive hex match, `**/*.ts,*.tsx` under `src/features/stock`. |
| L4 | C6 probe mechanism: how a violation is planted, where, and how reverted | plan gap | Amend C6 to name the mechanism. Recommend: the scan is a pure function over an injected file list; the probe passes a synthetic extra file — **and** the shipped call site is separately asserted to pass the real list, so the probe is not proving a helper that production never uses (charter rule 15's fifth instance). |
| L5 | S2 names three subjects (hex, **order indices**, name strings); C6 asserts only two | plan gap | Either add a third assertion for order indices or narrow S2. Recommend narrowing S2: `STOCK_STATES` array position *is* the index, so a numeric-literal scan has no honest target. |
| L6 | Home of the state union type: master plan §6 (L92) puts `StockState` in `types/stock.types.ts`; S2/C6(b) allow name strings only in `types/stock.dto.ts` | plan gap (registry) | Amend §6: name the wire union (e.g. `StockStateDto`) in `types/stock.dto.ts`, and define `StockState` in `stock.types.ts` as an alias/`typeof STOCK_STATES[number]` so it carries no literals. See F3. |
| L7 | `compareByStateIndex` signature, and what it returns for two equal states | plan gap | Amend §6 with the exact signature; add a C2 sub-row for the equal-state return. C2(d) sorts a permutation of five *distinct* states and can never observe it. See F4. |
| L8 | "Loud-fail on unknown state": which function throws (`getStockStateMeta` only, or the comparator too), what error type, and at which boundary (wire parse vs display) | **intention gap** | Route upstream to intention §4A MC1 (L112–120). A comparator that does not throw sorts an unknown state at index −1, ahead of `out_of_stock` — a silent ordering failure in charter rule 6's own family. See F4. |
| L9 | `STOCK_STATES` element shape: array of state-name strings, or array of meta objects | free choice | Explicit delegation. Recommend a readonly string-name tuple plus a separate `Record<StockState, StockStateMeta>`; it keeps `types/` free of literals (L6) and makes the "exactly five and only five" invariant a type-level fact. |
| L10 | Where `VITE_STOCK_API_MODE` is read — module top level vs inside a resolver called per request | plan gap | Amend Task 4 to fix the read site. A top-level `const` makes C5(a)(b)(c) untestable in one run without `vi.resetModules()` + dynamic import; the tempting workaround (a mutable module variable with a setter) creates a runtime switch the UI could reach, defeating S3's intent. |
| L11 | How anyone reaches mock mode when running the app | plan gap + **owner** | **Owner card 1**; then amend master plan §10 with the recorded route and, if A is chosen, add the script to plan 1's `package.json` perimeter. See F5. |
| L12 | Mock `itemCategories` content — contract §4.1 elides the list with `...` (L48) | **intention/vocabulary gap** + **owner** | **Owner card 2**; fold the answer into the contract copy or a recorded plan amendment before C4 can be written. |
| L13 | Literal `mergeKey` values in the report fixture — C3(b) says "values verbatim" but the contract's own literals are the placeholders `"<opaque>"` / `"<same opaque value>"`, which are different strings | plan gap | Amend C3(b): the pair shares one implementer-chosen opaque string (legal under S4's scope clause — `mergeKey` has no contract vocabulary); "verbatim" governs the other five fields. See F6. |
| L14 | What the mock implementations of POST 4.4 / PATCH 4.5 / DELETE 4.6 return, and whether mocks hold state across calls | plan gap | Amend Task 4 and add a C5 sub-row. Stateless stubs satisfy C5(a) exactly as written, and then P6's wizard demo creates an instance that vanishes on the next refetch — discovered at an owner visual pass, five phases downstream. See F7. |
| L15 | The seven api functions' signatures (parameters, return types, whether they unwrap `{data}`) | plan gap (registry) | Amend master plan §6 with one signature line per function. P4's controllers and every UI phase bind to these; C5(b) cannot even be written without them (PATCH/DELETE need an id, detail needs a location, POST needs a body). |
| L16 | vitest `globals: true` vs explicit `import { describe, it, expect } from "vitest"` | plan gap (perimeter) | Amend Task 1 to fix one. If globals: `tsconfig.app.json` must gain `"vitest/globals"` to `types` (currently `["vite/client"]`, L7), and that file is **not** in the plan's perimeter — C1's typecheck would fail and the implementer would edit outside the declared file list. Recommend explicit imports; no tsconfig change needed. |
| L17 | `src/vite-env.d.ts` must declare `VITE_STOCK_API_MODE` per repo convention (it enumerates all three existing vars, L4–L8) | plan gap (perimeter) | Add the file to "Files expected to change". Not a typecheck blocker — Vite 8's `ImportMetaEnv extends Record<string, any>` — but the `any` means a typo in the flag name is invisible, and the repo pattern is explicit declaration. |
| L18 | `src/test/setup.ts` import specifier for jest-dom | free choice with a trap | Explicit delegation: `@testing-library/jest-dom/vitest`. The bare `@testing-library/jest-dom` entry (v7) augments jest's namespace, not vitest's — verified in `node_modules/@testing-library/jest-dom/types/vitest.d.ts`. Silent in P1 (no DOM assertions); a typecheck failure at P5. |
| L19 | A standalone `vitest.config.ts` **replaces** `vite.config.ts` rather than merging it — react, tailwind and svgr plugins would not apply in tests | plan gap | Amend Task 1 and master plan §6 (L143–145). Recommend `mergeConfig(viteConfig, defineConfig({test:…}))`, or put the `test` block in `vite.config.ts`. Harmless in P1 (no JSX, no `?react` imports); breaks every RTL phase from P5. |
| L20 | Task 1 says "**Install** vitest, jsdom, …"; master plan §10 (L205–207) says they are already installed and "P1 verifies versions and configures; it does not install" | plan gap | Amend Task 1's verb to "verify and configure". All five are present in `package.json` devDependencies; an `npm install -D` would bump versions and further dirty an already-modified `package-lock.json`. |
| L21 | C3's trace cell reads `MC11, M2, M2A`, while the plan's own Notes (L47–48) say P2 builds its own fixtures and does not consume this one | plan gap (trace) | Re-trace C3 to `MC11, S4`. M2A's declared measurement is a **named mutation on the compaction function**, which is P2 code; a fixture that P2 never loads cannot serve it. This is the trace-to-an-entry-that-says-something-else shape. See F8. |
| L22 | Read-first list omits three sources the phase's own tasks and criteria require | plan gap | Amend the Read-first list: add `design_handoff/00-global/00-global.md` (C2(b)'s hexes exist **only** there), intention §4A **MC12** (Task 4 and C5(d) cite MC12a; the list says "§4A (MC1, MC11)"), and master plan **§3** (division of labor — it governs whether P1 scaffolds `ui/`). See F9. |
| L23 | C3(d)'s `quantity: 0` entry: which `stockState`, and which mergeKey group | free choice (derivable) | Delegation: `out_of_stock` (contract §1 line 16: `0 → out_of_stock`) and a **third** mergeKey — otherwise it breaks C3(b)/(c)'s "exactly two" counts. |
| L24 | C6's third assertion has no row identity — the criterion says "three assertions" but labels only (a) and (b) | plan gap (manifest property 1) | Relabel as C6(a) / C6(b) / C6(c) so each is separately addressable and separately citable by its probe. |
| L25 | Fixture location codes: contract examples use `LC1` and `H1`; the wizard picks locations from the bootstrap metafield options | free choice | Delegation with a note: use the contract's codes verbatim (S4), and record that if the shop's bootstrap options do not contain `LC1`/`H1`, P5–P7's demo shows a report and a wizard over disjoint location sets. Worth one line in master plan §10. |
| L26 | C4 vs contract §4.1: the JSON example gives `shape` the single category `["Dining Tables"]`; the final vocabulary table gives it six | free choice (decidable) | Delegation: the table wins — it says of itself "the exact payload content, safe to hardcode in mocks" (L57). Worth stating so the reviewer does not re-derive it. |

## Findings

### F1 — The `/api` prefix would be doubled, and C5(b) would certify it *(highest severity)*

**Artifacts:** plan 1 L27–29 (Task 4, "paths per contract §4"), L38 (C5(b), "at its contract
§4 URL"; C5(d)); `context/frontend-architecture.md` L76; master plan L222–223; contract
v1.2 L39 (§3, "Base path: `/api/stock/...`").

**Reality:** `apiClient` prepends `VITE_API_BASE_URL` (`src/core/api-client/index.ts:4`,
`actions/api-client.action.ts` `buildRequestUrl`). The workspace `.env` sets
`VITE_API_BASE_URL=http://192.168.1.246:4000/api` — the `/api` segment is already in the
base. I enumerated every endpoint literal passed to `apiClient` across `src/`: 24 distinct
strings, **none** beginning with `/api` (`/auth/login`, `/bootstrap`, `/zones`,
`/logistic/get-location`, `/shopify/metafields/options`, …). The convention is
unambiguous.

An implementer following Task 4 literally writes `apiClient.get("/api/stock/options")`,
which resolves to `…:4000/api/api/stock/options`. Every P1 test passes: C5(b) asserts the
call was made "at its contract §4 URL", which is the doubled string, so the criterion
*confirms* the defect. C5(a) never calls the network at all. The failure first becomes
observable at **P10**, nine phases later, against a live backend — and P10's own Task 1
("verify/add the dev proxy for `/api`") inherits the same wrong premise.

`context/frontend-architecture.md` §4's sentence "Endpoints are passed as absolute paths
(`/api/stock/...`); Vite dev server proxies" is false in both halves against this tree:
paths carry no `/api`, and `vite.config.ts` defines no proxy (nor needs one — the base URL
is absolute). Contract §3 is not wrong; it describes the *server* path. The plan
conflates a server path with an `apiClient` argument.

**Route:** amend plan Task 4 + C5(b)(d); amend the context doc §4 (home artifact for repo
conventions); amend master plan §10's proxy line and plan 10 Task 1.

### F2 — All three C6 assertions fail on the tree P1 itself must produce

**Artifact:** plan 1 L39 (C6); master plan L143–145 (tests colocated `<name>.test.ts(x)`
beside their source), L171–180 (S2), L181 (S3).

C6 scans `src/features/stock` and asserts *set equality* between the files containing a
match and its allowlist. Tests are colocated, so they are inside the scanned scope. Walking
the files P1 must create:

- **C6(a)** — `VITE_STOCK_API_MODE` allowlisted to `{api/stock-api-mode.ts}`. C5 must set
  that variable to three values, so the seam's test file contains the literal. So does
  C6's own scan file, which needs the string to search for. → **red**.
- **C6(b) hex** — allowlisted to `{domain/stock-states.domain.ts}`. C2(b) requires the five
  states' `text`/`tint`/`solid` asserted at their "exact hex", so
  `domain/stock-states.domain.test.ts` contains all fifteen. → **red**.
- **C6(b) name** — allowlisted to `{domain/stock-states.domain.ts, types/stock.dto.ts,
  api/mocks/*.fixture.ts}`. C2(a) asserts "exactly five states in the contract §1 order",
  which requires the five names; C3 asserts fixture `stockState` values. → **red**.

No artifact says the scan excludes tests, and the planner visibly *did* reason about which
non-source files legitimately carry state names — the allowlist explicitly admits
`api/mocks/*.fixture.ts`. Test files were simply not considered. This is the same defect
the S2 amendment note already records one level up ("the original blanket ban collided with
the report fixture — a guard no phase could pass"), recurring against the phase's own
tests.

**Route:** amend C6 to define its scan input set. Ledger L2–L4 carry the mechanism gaps
that must be settled in the same amendment.

### F3 — The registry and S2 disagree about where the state union lives

**Artifacts:** master plan L92 (`types/stock.types.ts` … `StockState`), L88–90 (the dto
list, which names **no** state union), L171–180 (S2), plan 1 L39 (C6(b)).

S2 and C6(b) permit state name strings in `types/stock.dto.ts`, but §6's dto inventory
never names a type that would carry them; §6 instead assigns `StockState` to
`types/stock.types.ts`, which **is not** on the allowlist. An implementer writing
`export type StockState = "out_of_stock" | …` in `stock.types.ts` — the file the registry
told them to put it in — reddens C6(b) immediately. Writing it in `stock.dto.ts` satisfies
C6(b) but contradicts §6. There is no reading of the two documents that is simultaneously
satisfiable without inventing a type the registry does not name.

**Route:** amend master plan §6 (add the wire union to the dto list by name; define
`StockState` as a derived alias). This is a foundation name every later phase imports.

### F4 — MC1's comparator and its loud-fail are both under-determined, and C2 cannot observe either gap

**Artifacts:** intention L112–120 (MC1); master plan L95–96; plan 1 L24–25 (Task 3), L35 (C2).

Three things the implementer must choose with no authority:

1. **Input type.** C2(d) ("sorting a shuffled state **array**") implies
   `(a: StockState, b: StockState) => number`, but P2's MC2/MC3 sort *rows*. If P1 ships a
   row comparator instead, C2(d) still passes on a mapped array and P2 inherits a signature
   the registry never described.
2. **Return for equal states.** MC1's invariant covers only "sorting any permutation of
   states reproduces the canonical order" — a permutation of five *distinct* values never
   compares two equal ones. A comparator returning `1` for equals passes C2(d) and silently
   destabilises every downstream sort that uses it as the first key of a chain (MC2 uses it
   as key 1 of 5; MC3 as key 1 of 2).
3. **Loud-fail scope.** MC1 says unknown wire states "fail loud (thrown error)"; C2(c) says
   "unknown state string throws" without naming the function. If only `getStockStateMeta`
   throws, an unknown state reaching `compareByStateIndex` yields `indexOf() === -1` and
   sorts *ahead of* `out_of_stock` — worse than out-of-stock, silently. Nothing states the
   error type either, so P4's controllers cannot discriminate it from any other throw, and
   nothing states whether validation happens at the wire boundary (`api/`) or at display:
   under the current plan an unknown state flows through P2's compaction key untouched and
   surfaces only at a P7 badge render.

Item 3 is an **intention gap** — MC1 is the home artifact — and belongs in charter rule 6's
named family (ordering). Items 1 and 2 are plan/registry gaps.

### F5 — Charter rule 10 is cited for the default, but the reachable path is the one that cannot work

**Artifacts:** intention L214–221 (MC11); master plan L108–110, L201–224 (§10); plan 1 L38
(C5(c)).

MC11 fixes the shipped default to `live` and cites charter rule 10 for it. Worked forward
on this tree: `.env` contains no `VITE_STOCK_API_MODE`; `npm run dev` therefore resolves
`live`; the live path targets `/stock/...` on a backend where 4.1–4.6 arrive after backend
P3 and 4.7 after backend P5 — i.e. nothing. So today `npm run dev` yields a stock feature
that errors on every screen.

Where would `mock` have to be set? The repo root `.gitignore` ignores `.env`, `*.env`,
`**/.env` and `**/*.env`, and `apps/frontend/.env` is untracked — so the flag cannot be
committed there. `.env.local` is *not* matched by those patterns and would be committed,
which is probably not intended either. **No artifact names a route at all**: master plan
§10 does not mention the flag, and no npm script sets it.

The consequence is not confined to P1. Master plan §3 and S5 make every UI phase's approval
depend on "the owner looking at the running app" — a gate that, as things stand, cannot be
reached for P5, P6, P7 or P9. Rule 10's letter is satisfied (the default reaches the live
code); its purpose is inverted (the path the project actually runs on is reachable by
nothing).

**Route:** owner card 1, then master plan §10.

### F6 — C3(b)'s "values verbatim" is not satisfiable as written

**Artifacts:** plan 1 L36 (C3(b)); contract v1.2 L119–128 (§4.7 example), L130–134.

C3(b) requires the §4.7 example pair "values verbatim". The example's two `mergeKey`
literals are `"<opaque>"` and `"<same opaque value>"` — placeholders, and *different
strings*. Copying them verbatim produces two entries that do **not** share a mergeKey,
which is the opposite of what C3(b) asserts. The implementer must invent one value.

That is legal — the contract declares `mergeKey` opaque with no vocabulary, so S4's scope
clause covers it — but the criterion as written is undecidable and a reviewer applying S4
literally would raise it as a defect. Amend C3(b) to scope "verbatim" to the five
non-opaque fields and state that the pair shares one implementer-chosen opaque string.

### F7 — Mock mutation semantics are unspecified, and C5(a) is satisfied by stubs that break the demo

**Artifacts:** plan 1 L27–29 (Task 4), L38 (C5(a)); L42–48 (Notes: "Mock fixtures are the
project's demo data until P10"); contract L92–109 (§4.4–4.6).

C5(a) asks only that each function "resolves from fixtures" with zero fetch calls. Three of
the seven functions are mutations. A constant-returning stub satisfies C5(a) perfectly and
leaves the demo incoherent: create a definition in the P6 wizard, and the P5 location
detail that refetches immediately afterwards does not contain it. Contract §4.4 also
specifies that the create response carries the *real* initial quantity and state — a
detail a mock can only approximate, and nothing says how.

Whether the mock layer holds in-memory state across calls within a session is a real
architectural decision with visible consequences at four later owner gates, and no artifact
takes it. It should be decided in P1, where the mock layer is authored — not discovered at
P6.

### F8 — C3 traces to measurements it cannot serve

**Artifacts:** plan 1 L36 (C3 trace: `MC11, M2, M2A`), L47–48 (Notes); intention L297–304
(M2A), L294–296 (M2).

M2A's declared content is a named mutation — "removing `stockState` from the grouping key
**in the compaction function**" — and the compaction function is P2's `compactEntries`.
The plan's own Notes state that "the P2 domain tests build their own fixtures and do not
consume this one." A fixture that the serving test never loads does not serve the
measurement; it is at best a *reason the demo data looks right*, which is what the Notes
actually argue. The same objection applies more weakly to M2 ("the rendered report equals
the contract's ordering, merge and count rules") — C3 renders nothing and asserts no
ordering.

C3 is a genuine and valuable row; its honest trace is `MC11` plus S4's population clause.
Leaving `M2A` in the cell means the phase claims a measurement it does not deliver, and the
coordinator's reverse check ("every claimed ledger entry is served by at least one row")
reads green on a row that cannot serve it.

**Reverse-direction check, for the record:** every ledger ID and mechanism ID the phase
claims (MC1, MC11, MC12a, M2, M2A, M4, plus S7's exemption for C1) is claimed by at least
one row; no claimed entry is unserved. The defect is in the forward direction only.

### F9 — The Read-first list omits three sources the phase's own criteria require

**Artifact:** plan 1 L10–12.

- **`design_handoff/00-global/00-global.md`** — C2(b) demands "exact hex from design
  00-global" for fifteen values. Those hexes exist in no other artifact: not in master plan
  §6, not in the intention (MC1 points *at* the design file rather than restating it). The
  implementer literally cannot write C2(b) from the list they are given. Master plan §2 says
  the design handoff is read "00-global once per session + the phase's screen folders",
  which supports adding it.
- **intention §4A MC12** — the list reads "§4A (MC1, MC11)", but Task 4 and C5(d) both cite
  **MC12a**, which lives inside MC12 (intention L223–229). Read literally, the implementer
  is told to implement a mechanism whose contract is outside their reading.
- **master plan §3** — the list gives §5–§6 and §9–§10. §3 carries the division of labor,
  including "Codex … never touches `ui/` (except scaffolding empty exports the registry
  names)". Task 2 says "create the feature skeleton folders" without saying whether `ui/` is
  among them; the rule that answers it is in an unread section.

**On intention §10** (the prompt asked whether it binds): it does **not**. §10 is the
pre-implementation protocol — RATIFIED → mechanism-inventory → planner — a gate ordering
already discharged, addressed to the pipeline rather than to the implementer. Correctly
omitted. Intention **§5** and **§6** are also omitted and, unlike §10, are substantive
(report data mechanism; per-endpoint usage summary) — but both are fully restated by
contract v1.2 §4.7 and §4.1–4.6, which *are* on the list. No amendment needed; recorded so
the coordinator need not re-derive it.

## Counts and derivations — all four reconcile

Per the prompt's instruction to derive every count the plan asserts:

| plan assertion | source | derived | verdict |
|---|---|---|---|
| five states | contract v1.2 §1 (L15) | `out_of_stock, low_in_stock, medium_in_stock, normal_in_stock, high_in_stock` = 5 | ✅ (matches MC1 L113–114 and design 00-global L14–18) |
| eight vocabulary keys | contract §4.1 final table (L61–68) | `wood_type, years, weight_definition, country, shape, extension_type, extension_quantity, upholstery` = 8 | ✅ |
| six report-entry fields | contract §4.7 example (L121–123) | `location, itemCategory, properties, mergeKey, quantity, stockState` = 6 | ✅ (matches C3(a)'s enumeration exactly) |
| seven api functions | master plan §6 (L104–107) | 7 files = contract §§4.1–4.7 = 7 endpoints | ✅ |
| mutation count 3 | plan L50–52 | C6 declares "one probe per assertion, three total" over three assertions | ✅ arithmetically — but see L24: only two of the three assertions have row ids, so the third probe cannot be cited against a row. |

## Criteria decidability — summary

| row | decidable now? | blocker |
|---|---|---|
| C1 | partly | L16 (globals/tsconfig), L19 (config merge), L20 (install vs verify). Also: C1 is met by running commands, which charter rule 1 forbids absent the environment-lifecycle exemption; S7 grants the *trace* exemption, not the rule-1 one. Worth one line from the coordinator on whether C1 is a rule-1 exemption and where its Review-log record goes. |
| C2 | no | (b) hexes not in the Read-first list (F9); (c) throw site/type undetermined (F4); (d) equal-state return unobservable (F4) |
| C3 | no | (b) "verbatim" unsatisfiable (F6); trace wrong (F8); (d) state/group underdetermined (L23) |
| C4 | no | `itemCategories` elided in the contract (card 2); example-vs-table conflict (L26) |
| C5 | no | endpoint prefix (F1); seven signatures absent (L15); mock mutation semantics (F7); flag read site (L10) |
| C6 | no | fails on its own tests (F2); scan and probe mechanisms absent (L3, L4); S2 subject mismatch (L5); no third row id (L24) |

Zero of six rows are writable as they stand. C2, C5 and C6 carry the silent-failure weight.

## Write perimeter

This session wrote **exactly one file**:

- `docs/under_development/stock_locations/handoffs/reviewer/plan_1_round_0_projection_handoff.md` (this file)

No other file was created, edited, moved or deleted. No code was written, no test was run,
no command was executed beyond read-only inspection (`ls`, `cat`, `sed -n`, `find`, `grep`,
`git ls-files`, `git check-ignore`, and `node -p` reads of three `package.json` version
fields inside `node_modules/`). No tool-recorded state (no archgraph in this repo per master
plan §8). The L4 budget of 0 was respected; no authorization line was needed because nothing
was executed.

## Appendix — paper skeleton (NON-AUTHORITATIVE, DISCARDED)

Recorded only as evidence that the derivation was actually performed. **The implementer
must not receive this as guidance**; it is one projection session's sketch, not a second
plan, and every question it silently answers is a ledger row above.

- `types/stock.dto.ts` — 8 interfaces per §6 + a wire state union (L6). `StockReportEntryDto`
  = the six fields of §4.7. `StockErrorEnvelope` = `{ error: { code, message, details?,
  requestId } }` (contract §3), with 409 `details.conflictingId`.
- `types/stock.types.ts` — `StockState` derived, not restated (L6, L9); `StockStateMeta =
  { label, text, tint, solid }`; the six later view types as declared shells.
- `domain/stock-states.domain.ts` — `STOCK_STATES` (5, contract §1 order),
  `STOCK_STATE_META: Record<StockState, StockStateMeta>` (15 hexes from design 00-global),
  `getStockStateMeta(state): StockStateMeta` throwing on unknown, `compareByStateIndex`
  (signature per L7, throw policy per L8).
- `api/stock-api-mode.ts` — one exported resolver reading `import.meta.env`, defaulting
  `"live"`; the only file naming the flag (L10).
- `api/<endpoint>.api.ts` ×7 — each selecting live vs mock behind one exported function
  (signatures per L15); live calls take the §4 path **without** `/api` (F1); the detail
  endpoint encodes its location segment with `encodeURIComponent` (MC12a).
- `api/mocks/*.fixture.ts` — options fixture = the 8-key table verbatim + an
  `itemCategories` list pending card 2; report fixture ≥5 entries satisfying C3(b)(c)(d)
  under L13/L23.
- Tests colocated; the C6 scan's home and input set are exactly what F2/L2 leave open.
