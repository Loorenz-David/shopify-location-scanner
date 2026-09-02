# Plan 10 — Live integration

**Implementer:** Codex · **Depends on:** P9 APPROVED **AND** backend availability
(config endpoints after backend phase P3; report endpoint after backend P5 — contract
§7). **Deliberately thin — refine at prompt time** against the backend state of the day.

## Goal
Flip the feature from mocks to the live backend and prove the seam: config endpoints
end-to-end, report endpoint end-to-end, WS-driven refresh against real events. NOT
here: new features, UI changes beyond defect fixes routed by review.

## Read first
Master plan §6 (API seam), §10 · intention §4A MC11 + §8 (M1, M4, M5) · contract **v1.4**
(all) · `vite.config.ts`.

## Tasks (refined at prompt time)
1. Confirm `VITE_STOCK_API_MODE` default reaches live in a production build (MC11 /
   charter rule 10), and that no machine's `.env` override leaks into the build.
   **No dev proxy is involved** *(amended 2026-09-01, plan-1 projection F1)*: the earlier
   "verify/add the dev proxy for `/api`" task rested on a false premise — `VITE_API_BASE_URL`
   is absolute and already ends in `/api`, and endpoint arguments carry no `/api` prefix
   (master plan §6, `context/frontend-architecture.md` §4). If a URL comes out as
   `…/api/api/stock/…` here, the defect is a doubled prefix in the `api/` layer, not a
   missing proxy.
2. Run the app against the live backend: options vocabulary vs 4.1 fixture drift
   check; full W1 (create/edit/delete incl. a real 409) and W2/W3 flows.
3. Capture any wire-vs-contract divergence as a finding routed to the backend track
   (filing rule: master plan §2), never absorbed silently.

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Automated: a production-mode build resolves the seam to the live implementation with the flag unset (unit test on `stock-api-mode` resolution under `import.meta.env` variants). **Named mutation M1:** invert the resolution so an unset flag yields `mock` → this row reds. This is the phase's worst failure and the reason charter rule 10 exists: a production build that silently serves fixtures looks entirely healthy — screens populate, nothing errors — while showing invented stock to real users. | MC11 |
| C2 | Automated: live api functions hit the exact contract paths/methods/payloads (fetch-spy contract test per endpoint — enumerated, seven endpoints, one row each). | M1, M4, M6 |
| C3 | Environment-lifecycle (charter rule 1 exemption — manual, recorded in the Review log with date/actor): real create→409→edit→delete round-trip observed against the live backend; report renders real data; a real scan moves a quantity via WS refetch. Automated proxy: C2 + P4's C5/C6 suites. | M1, M2, M5 |

## Notes
The mock fixtures remain (dev tooling + tests) — only the default path flips. If the
backend's §4.1 vocabulary drifted from the fixture, update the fixture and flag the
contract version question to the backend track.

**Mutation count 1** — C1 (M1, the seam's default resolution).

**Much of task 2 is already discharged — do not re-derive it** *(coordinator lint, 2026-09-02;
master plan §7C)*. The backend was merged after P6 and the owner has already run real traffic
through the feature. Verified against live data and the merged backend source:
- **Casing** is lowercase on the wire, and the vocabulary carries display casing; `displayValueFor`
  round-trips multi-word values.
- **`mergeKey`** is `itemCategory` + `|` + `propertiesCanonical` — no location, no state — which is
  what P2 assumed.
- **`propertyOptions` key order** is identical to the fixture, key for key. **No fixture drift.**
- **The 409 envelope** carries `conflictingId` on stored-definition conflicts, and the owner has
  seen the conflict banner render end to end.
- **DELETE** returns `{ ok: true }`, which the frontend already types.
- **Create** works: three definitions exist, made through the wizard against the live backend.
- The **doubled-prefix** hazard task 1 warns about is already guarded — `api/stock-api.test.ts:268`
  asserts no URL contains `/api/api/`.

**What is therefore actually left**, and what this phase must not skip:
1. **C1's production-build resolution** — never yet exercised; the app has only ever run in dev.
2. **Edit and delete against the live backend.** Create and 409 are done; the other two W1 paths
   are not.
3. **The report against real, non-zero data.** Every definition currently sits at `quantity 0` /
   `out_of_stock`, so ordering, the counter tiles and MC3a's group ranking have **never been seen
   with real numbers**. Scan stock in first — backend runbook §2 — or this proves nothing.
4. **A real WS refetch**: a scan moving a quantity and the screen following it (M5).
5. **The download fallback in Firefox and desktop Safari** — the inherited hazard below.

**S10 applies to C2.** A fetch-spy contract test passes trivially if the spy cannot tell one
endpoint from another: assert the exact method **and** path **and** payload per row, and make the
seven rows distinguishable from each other, not merely present.

## Review log
- **2026-09-02 · C3 discharged by the owner · APPROVED.** The owner ran the manual live checks and
  reported all of them correct. That closes the four outstanding items: the live
  `create → 409 → edit → delete` round trip, the report against real data, the WS-driven refetch,
  and the Firefox / desktop Safari download check inherited from P8 — so `downloadPdf`'s detached
  anchor lands a file in practice, and no fix is needed.

  **What this record is, precisely.** C3 is a charter rule 1 exemption: manual, environment-lifecycle
  evidence. The verdict here is the **owner's attestation on 2026-09-02**, not a step-by-step
  observation log — no session watched these runs, and the coordinator is not going to write detail
  it did not see. Anyone re-verifying should re-run the sequence in this plan's task list rather
  than treat this entry as a transcript. Recorded this way deliberately: the constraint reduces
  effort, it must never inflate claims about what was checked.

  The automated half stands separately and is repeatable: C1 and the seven C2 rows in
  `api/stock-live-integration.test.ts`, verified by the coordinator, plus P4's C5/C6 suites as the
  proxy for the lifecycle and WS paths.

  **P10 is APPROVED. This is the final phase — the build is complete.**

- **2026-09-02 · round 1 consumption · coordinator · BLOCKED, awaiting owner-only evidence.**
  The session delivered the automated half and **stopped at C3 because no browser was available**,
  reporting that plainly instead of manufacturing a manual record. That is the right call and the
  handoff says so in its own words; C3 is an explicit charter rule 1 exemption and its evidence
  cannot be synthesised.

  Verified: C1 and the seven C2 rows exist as 8 tests in
  `api/stock-live-integration.test.ts`, each asserting method, exact final path and payload, with
  the location and configuration ids proving URL encoding. Suite is 27 files / 176 tests, typecheck
  clean. The tests were committed inside the owner's `80e3ba8` rather than a phase checkpoint —
  noted, not a defect; nothing was lost.

  **Still outstanding, all of it requiring a person at a browser:**
  1. The live `create → 409 → edit → delete` round trip. Create and the 409 are already done from
     earlier owner testing (§7C); **edit and delete are not**.
  2. **A report with non-zero quantities.** Nothing has been scanned into any definition, so row
     ordering, the counter tiles and MC3a's group ranking have *still* never run against real
     numbers. Backend runbook §2 is the procedure.
  3. A real WS refetch — a scan moving a quantity and the screen following it.
  4. The **Firefox and desktop Safari download check** inherited from P8: `downloadPdf` revokes its
     object URL synchronously and never attaches the anchor, which is exactly what fails in the two
     browsers the fallback exists for.

  Separately, the coordinator folded **contract v1.6** and audited the out-of-pipeline changes that
  arrived with it; master plan **§7E** carries that in full. Nothing there required frontend work:
  the report screen renders the new restock number unconditionally (the contract's third boundary
  case, the one that "looks like a bug and is not"), the local fallback prefers the backend's value
  and is recorded with a removal trigger, and **P2's and P7's named mutations were re-planted and
  both still red** after the owner's 1359-line refactor of approved-phase code.

- **2026-09-02 — Codex implement round 1:** Added the phase-specific live seam test file with
  one C1 resolver case and seven distinguishable C2 endpoint cases. The existing resolver already
  implements the contract (`mock` only on explicit `"mock"`, otherwise `live`), so no production
  seam change was needed. The required M1 mutation was applied at the resolver definition,
  executed unfiltered, observed red, and restored from a byte copy; see the implementer handoff
  for the complete failure-ID ledger and tree evidence. The production build was run with an
  empty `VITE_STOCK_API_MODE` process value and succeeded; the emitted stock bundle resolves the
  default branch to `live`.
- **Judgment call:** The download fallback was not changed. The plan requires confirmation in
  Firefox and desktop Safari before applying the prescribed anchor-lifecycle fix; the browser
  runtime exposed no available browser in this session, so changing the code would be an
  unobserved defect fix rather than evidence-led repair.
- **Environment:** `apps/backend` reports no pending Prisma migrations. The repository-wide lint
  baseline remains 48 errors / 14 warnings; the new test file and the resolver are lint-clean,
  and frontend typecheck is green.
- **Blocking observation:** C3's live create → 409 → edit → delete, non-zero report, and WS
  refetch run was not performed because the browser inventory was empty. The phase must not be
  marked IMPLEMENTED until that manual run and the Firefox/Safari fallback check are recorded.
## Inherited hazard — the download fallback is unverified in a real browser

*(Routed by the coordinator 2026-09-02 from P8's consumption, forward hazard 3.)*

`downloadPdf` **revokes the object URL synchronously and never attaches the anchor to the
document**. That pattern works in Chrome and in WebKit-on-iOS, and is exactly the pattern that
fails in **Firefox and desktop Safari** — the browsers the anchor fallback exists *for*, since they
are the ones without `navigator.share`. No unit test can settle this: jsdom has no download
behaviour to observe, and P8's C7(b) asserts only that `createObjectURL` and `click` were called.

**Check on real browsers:** trigger a PDF export in Firefox and in desktop Safari and confirm a
file actually lands on disk. If it does not, the fix is to append the anchor to `document.body`
before clicking and revoke the URL on the next tick rather than immediately.
