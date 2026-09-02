---
plan: 10
role: implement
state: BLOCKED
date: 2026-09-02
actor: Codex
---

# Plan 10 implementation handoff

The phase added eight seam tests and verified the existing production resolver/build path. No
production code remains changed by this phase. The phase is blocked at its manual evidence gate:
the required real-data/browser run could not start because no browser is available to this
session.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

## Coverage map (Task 0)

| criterion row | test id that discharges it | assertion shape |
|---|---|---|
| C1 | `C1` in `src/features/stock/api/stock-live-integration.test.ts` | exact: unset and explicit `live` resolve to `live`, while explicit `mock` remains `mock` |
| C2(a) — GET options | `C2(a)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final `/api/stock/options` path, and no payload |
| C2(b) — GET locations | `C2(b)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final `/api/stock/locations` path, and no payload |
| C2(c) — GET location detail | `C2(c)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, URL-encoded final path, and no payload |
| C2(d) — POST configurations | `C2(d)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final path, and serialized create payload |
| C2(e) — PATCH configuration | `C2(e)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final path, and serialized update payload |
| C2(f) — DELETE configuration | `C2(f)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final path, and no payload |
| C2(g) — GET report | `C2(g)` in `src/features/stock/api/stock-live-integration.test.ts` | exact: method, final `/api/stock/report` path, and no payload |
| C3 — live lifecycle/report/WS observation | manual live-browser/runbook record below; automated proxy is C2 plus inherited P4 C5/C6 suites | manual row is stronger than the proxy for real backend data, browser rendering, and WS refetch; the proxy does not prove those live observations |

Baseline captured before the first production edit: `npm test` in `apps/frontend`; 26 test files,
162 passed, 0 failed. Failing-ID set: `∅`. The repository had foreign dirty changes before this
session; they are outside this phase perimeter.

## Reverse map reservation

Every test in the phase-specific test file is declared above: `C1` and `C2(a)`–`C2(g)`. No test
is intended to ship as an orphan or as a candidate criterion.

## Criterion evidence

### C1 — production default

- `C1` passes in the phase test file for unset mode → `live`, explicit `live` → `live`, and
  explicit `mock` → `mock`.
- `VITE_STOCK_API_MODE= npm run build` succeeded from `apps/frontend`. Inspection of the emitted
  `dist/assets/stock.actions-CqbKpKvG.js` bundle showed the resolver compiled to a `live` default
  branch while retaining the explicit mock branch. `dist/` is ignored/generated output and was
  not included in the write perimeter.

### C2 — seven live API rows

`npx vitest run src/features/stock/api/stock-live-integration.test.ts` passed 8/8. The seven C2
rows each assert the final `/api/stock/...` path, exact HTTP method, and exact serialized payload
where applicable; the location and configuration IDs also prove URL encoding. The test file is
the phase's only new test surface, and every test maps to C1 or one C2 row in the coverage map.

### C3 — manual live lifecycle/report/WS

**Not run.** No browser was available: browser setup reported “No browser is available,” and the
availability inventory returned `[]`. Consequently this session did not observe the real
create → 409 → edit → delete lifecycle, a report with non-zero quantities, or a scan-driven WS
refetch. The automated C2 transport cases and inherited P4 C5/C6 suites are only proxies; they do
not prove live data, rendering, or a real WS event. The owner/coordinator must repeat the runbook
once a browser-backed signed-in session is available:

1. Create two catch-all definitions (`LC1` and `H1`) and then the narrower `LC1` Teak definition;
   record backend-computed non-zero quantities and sibling reallocation.
2. Trigger a duplicate to observe the real 409 banner, then edit and delete a definition.
3. Scan/move stock and record the quantity change appearing after the `scan_history_updated`
   refetch; verify the report ordering, counter tiles, and grouped ranking with non-zero data.
4. Export using the fallback in Firefox and desktop Safari and confirm a file lands on disk.

## Named mutation ledger

Declared mutation arithmetic: C1/M1 = 1; C2 = 0; C3 = 0; **total declared = 1**.

| row | site and mutation | command/scope | observed result | reverted file |
|---|---|---|---|---|
| C1/M1 | `src/features/stock/api/stock-api-mode.ts`, resolver definition (not call site): change the non-mock branch to return `"mock"` | `npm test` from `apps/frontend` (unfiltered full suite) | **11 failures**: `C1`, `C2(a)`–`C2(g)`, inherited `C5(b)`, `C5(c)`, and `C5(d)`. The observed assertions were the resolver returning `mock`, live calls not reaching `fetch`, and mock update state missing `config-1`. 2 files failed, 159 passed; failing-ID delta against the pre-phase `∅` baseline is the 11 IDs listed here. | `src/features/stock/api/stock-api-mode.ts`, restored from `/private/tmp/plan10-stock-api-mode.ts.original` (original SHA-256 `8cb80f5f6fe7a33f6eaa7f83c07a1ff7c4e72998bc2b56aeb1247640bcc23b49`) |

`executed = 1`, `declared = 1`; no named mutation was carried forward. The probe touched only
`stock-api-mode.ts` and made no fix change. It was followed by a green targeted phase suite.

## Test and environment evidence

- Pre-edit baseline: `npm test` before adding phase tests or editing production — 26 files,
  162 passed, 0 failed; failing-ID set `∅`.
- Phase suite after restoration: 1 file, 8 passed, 0 failed.
- Typecheck: `npm run typecheck` — passed.
- Touched-file lint: `npx eslint src/features/stock/api/stock-live-integration.test.ts src/features/stock/api/stock-api-mode.ts` — passed with 0 problems.
- Repository lint: `npm run lint` — documented baseline 48 errors / 14 warnings; no new issue in
  either phase-owned/touched source file.
- Backend gate: `npx prisma migrate status` in `apps/backend` — database schema up to date, no
  pending migrations.

## Closing L4 stamp

Final full-suite stamp on the pre-final-handoff tree: `npm test` — 27 test files, 170 passed,
0 failed; failing-ID set `∅`. The same tree passed `npm run typecheck`, and the phase-owned source
lint command passed. Tree identity was checkpoint `ea62be5` plus total tracked-diff SHA-256
`efe3db37c592f6ef213233154f45eafd84a3c5484872317041acd1729bd30bde`; the foreign tracked-diff
digest, excluding this phase's plan Review-log edit, is
`1a6c958bb18c2bcfbefb669ecc5e96634697f3e1b3deb8da3ba98efe6e423c1d`. The final handoff edit is
documentation-only and does not alter the tested source tree. The session has no IMPLEMENTED
checkpoint commit because C3 and the browser fallback criterion remain outstanding.

## Write perimeter and foreign worktree state

### Phase-owned writes

- `apps/frontend/src/features/stock/api/stock-live-integration.test.ts` — new phase test file.
- `apps/frontend/docs/under_development/stock_locations/plans/plan_10_live_integration.md` — this
  round's Review log entry.
- `apps/frontend/docs/under_development/stock_locations/handoffs/implementer/handoff_plan_10_implement_1.md` — this handoff.

### Mutation-only write, applied and reverted

- `apps/frontend/src/features/stock/api/stock-api-mode.ts` — M1 only; final bytes match the
  pre-probe source and no production fix was made.

### Foreign pre-existing writes preserved

The tracked foreign diff was present before this session and remains untouched (15 modified UI
files); its `git diff --binary` SHA-256, excluding the phase plan edit, is
`1a6c958bb18c2bcfbefb669ecc5e96634697f3e1b3deb8da3ba98efe6e423c1d`. The owner's pre-existing
untracked additions under `apps/frontend/docs/under_development/stock_locations/backend_handoff/` 
(`frontend-api-contract copy.md`), `apps/frontend/src/features/stock/domain/`
(`stock-category-images.domain.ts`, `stock-location-groups.domain.test.ts`,
`stock-location-groups.domain.ts`), `apps/frontend/src/features/stock/ui/`
(`StockCategoryThumbnail.tsx`), and `apps/frontend/src/share/location-codes/` (`index.ts`,
`location-codes.ts`) were also preserved. No sibling worktree was touched.
