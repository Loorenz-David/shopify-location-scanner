# Codex implementation plan

Implementation follows intention §13A in eight phases: schema/contracts; pure stock domain;
HTTP and persistence; sync and processed handlers; queues/workers; triggers; admin endpoints;
verification and handoff. Every phase ends with `cd apps/backend && npm run typecheck` at zero
errors and an explicit-path `manager-signals:` commit. Verification uses a sqlite `.backup` scratch
copy and a local `node:http` Manager stub only. The 22 checks and five probes are implemented
exactly as §13A specifies; §12A.1–§12A.11 map respectively to stock domain, stock calculation,
ledger, sync queue, signal lifecycle, ScanHistory hook, processed re-drive, HTTP classifier,
delivery endpoints, triggers, and criteria validation. No open questions.
