---
plan: 7
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-02
actor: Claude Fable 5.1 (Claude Code)
---

# P7 — per-instance count: implementation handoff

**Summary.** Backend and frontend implemented in one session from `plans/plan_7_per_instance_count.md`
on the owner's instruction, without lint or projection. All instruments green (backend
`SUMMARY PASS 3 script(s)`, 124 rows; frontend 209/209, typecheck 0, lint = HEAD baseline).
Six mutation probes run and reverted; every one reddened the rows it was aimed at. Contract
reissued **v1.7**; master plan §6.1/§6.2/§6.4/§6.5 and tracker updated. Full narrative, judgment
calls, re-sitings and the mutation ledger are in the plan's Review log (2026-09-02 IMPLEMENTED
entry) — this file is the perimeter and the cards.

## ⚠ OWNER DECISIONS REQUIRED (0)

The one card (backfill `prisma/dev.db`) was answered in session: the rebuild script gained the
explicit opt-in `ALLOW_CONFIGURED_DATABASE=1` and the local database was rebuilt (plan Review log,
last entry). Production still follows runbook R1–R5 without the flag.

## Write perimeter (this session)

**Backend — modified:** `apps/backend/prisma/schema.prisma` · `scripts/rebuild-location-stock.ts` ·
`scripts/verify-stock-domain.ts` · `scripts/verify-stock-reconciliation.ts` · `scripts/verify-stock-report.ts` ·
`src/modules/stock/contracts/stock.contract.ts` · `src/modules/stock/queries/get-stock-report.query.ts` ·
`src/modules/stock/repositories/location-stock.repository.ts` ·
`src/modules/stock/services/apply-item-stock-change.service.ts` ·
`src/modules/stock/services/stock-reconciliation.service.ts`.
**Backend — new:** `prisma/migrations/20260902170346_add_location_stock_instance_count/migration.sql` ·
`src/modules/stock/domain/allocation.ts`.
**Backend — untouched on purpose:** `scripts/verify-all.ts`, the four `src/modules/shopify/` call
sites, `controllers/stock.controller.ts`, `routes/stock.routes.ts`, `commands/*`.

**Frontend — modified (`apps/frontend/src/features/stock/`):** `actions/stock.actions.ts` ·
`api/mocks/get-stock-location-detail.fixture.ts` · `api/mocks/get-stock-report.fixture.ts` ·
`api/mocks/mock-state.ts` · `controllers/stock-report.controller.ts` · `domain/stock-pdf.domain.ts` ·
`domain/stock-report.domain.ts` · `stores/stock-report.store.ts` · `types/stock.dto.ts` ·
`types/stock.types.ts` · `ui/GeneratePdfSheet.tsx` · `ui/StockEntryDetailView.tsx` ·
`ui/StockFilterSheet.tsx` · `ui/StockReportEntryRows.tsx` · `ui/StockReportPage.tsx` ·
`ui/pdf/StockReportPdf.tsx`. **Tests modified:** `api/stock-api.test.ts` ·
`controllers/stock-report.controller.test.ts` · `domain/stock-pdf.domain.test.ts` ·
`domain/stock-report.domain.test.ts` · `ui/GeneratePdfSheet.test.tsx` · `ui/StockReportPage.test.tsx` ·
`ui/pdf/StockReportPdf.test.tsx`.
**Frontend — new:** `domain/stock-count-mode.domain.ts` · `domain/stock-report-settings.domain.ts` ·
`domain/stock-report-settings.domain.test.ts`.
**Frontend — listed in the plan, not changed:** `ui/StockLocationDetailView.tsx` (renders no count).

**Docs:** `contracts/frontend-api-contract.md` (→ v1.7) · `master_plan.md` (§6.1, §6.2, §6.4, §6.5,
tracker row P7) · `plans/plan_7_per_instance_count.md` (header + Review log) ·
`plans/plan_6_maintenance_verification.md` (one appended Review-log note) · this file.

**Tool-recorded state:** `prisma/dev.db` migrated by `prisma migrate dev` (schema only; row data
unchanged, checksum-verified across every verify run). Scratch copies under the session scratchpad
only. **Nothing committed** — the owner did not ask for a commit.

## Files a mutation probe touched (applied and reverted; not part of the change)

`src/modules/stock/services/apply-item-stock-change.service.ts` (probe i) ·
`src/modules/stock/repositories/location-stock.repository.ts` (probes ii, iii) ·
`src/modules/stock/services/stock-reconciliation.service.ts` (probe ii-b) ·
`apps/frontend/src/features/stock/domain/stock-report.domain.ts` (probe iv). Each restored from a
byte copy; `git diff` of the file verified equal to its pre-probe state afterwards.

## For the coordinator to fold upstream

- The state refactor (`4fcbc17`) never reissued the contract; v1.7 folds it. The intention still
  reads `normal_in_stock`/`unitsToNormalThreshold` in §27 — not touched here (not this phase's file).
- C3(h) is a shared-scenario assertion (one message for eight rows on failure) and probe (ii) needed
  a second site (ii-b) to reach C2(d). Both are plan-text findings, not code findings.
- The rebuild script is a third `calculateStockState(instanceCount, …)` site no script row observes.
- Candidate criterion: none added beyond the plan's rows.
