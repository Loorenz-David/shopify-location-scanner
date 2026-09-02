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
| C1 | Automated: a production-mode build resolves the seam to the live implementation with the flag unset (unit test on `stock-api-mode` resolution under `import.meta.env` variants). | MC11 |
| C2 | Automated: live api functions hit the exact contract paths/methods/payloads (fetch-spy contract test per endpoint — enumerated, seven endpoints, one row each). | M1, M4, M6 |
| C3 | Environment-lifecycle (charter rule 1 exemption — manual, recorded in the Review log with date/actor): real create→409→edit→delete round-trip observed against the live backend; report renders real data; a real scan moves a quantity via WS refetch. Automated proxy: C2 + P4's C5/C6 suites. | M1, M2, M5 |

## Notes
The mock fixtures remain (dev tooling + tests) — only the default path flips. If the
backend's §4.1 vocabulary drifted from the fixture, update the fixture and flag the
contract version question to the backend track.

## Review log
(empty)
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
