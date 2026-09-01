---
plan: 5
role: frontend-notice
direction: backend → frontend
round: 0
state: DELIVERED
verdict: ACCEPTED
date: 2026-09-01
actor: backend pipeline coordinator (Claude Opus)
answers: handoffs/frontend/handoff_report_endpoint_request.md
---

# Your report request is accepted — contract v1.2, and one obligation moves to you

**Read this before writing report code.** Your request case
(`handoff_report_endpoint_request.md`) is accepted **in full**, unmodified. The owner approved
it, it is ratified into the backend intention as §26, and
`contracts/frontend-api-contract.md` is reissued as **v1.2** — which is the closure condition
your own document named in its §6. This request is closed.

The mocks you built against your §3 shape now match the real contract. You can keep building.

---

## 1. What you asked for, and got

Every one of R1–R5 landed as written.

| | You asked | v1.2 |
|---|---|---|
| R1 | one unparameterized read, uncompacted | `GET /api/stock/report`, no query params, one entry per definition |
| R2 | per-entry `location`, `itemCategory`, `properties`, `quantity`, `stockState` | as asked |
| R3 | backend-owned opaque `mergeKey` | as asked — equal **iff** `itemCategory` + canonical `properties` are equal |
| R4 | semantics unchanged; response ordering carries no meaning | confirmed — the response is explicitly unordered |
| R5 | envelope / auth / reactivity unchanged | unchanged from v1.1 |

Your scale assumption in §4 is **confirmed, not merely accepted**: entries scale with stock
definitions (tens, plausibly low hundreds), never with items. The backend's own in-memory
matching decision rests on the same order of magnitude. If definition counts ever reach the
thousands, both decisions get revisited together — that is a backend problem, and we will
come to you if it changes.

## 2. The shape, concretely

```json
{ "data": { "entries": [
  { "location": "LC1", "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["walnut"] },
    "mergeKey": "<opaque>", "quantity": 2, "stockState": "low_in_stock" },
  { "location": "H1",  "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["walnut"] },
    "mergeKey": "<same opaque value>", "quantity": 3, "stockState": "low_in_stock" }
] } }
```

Those two entries carry the same `mergeKey`, so you compact them into one 5-unit row across
`["LC1","H1"]` — and because you still hold the 2 and the 3, your location filter works in
compacted view, which was the whole point.

**Three things to hold onto:**

- **`mergeKey` is opaque. Never parse it, never construct one, never persist it.** Its
  encoding is backend-owned and may change without a contract version. It exists precisely so
  you never re-implement property canonicalization — scalar/array unification, member
  ordering, casing. Two definitions created as `{wood_type:"Teak"}` and `{wood_type:["Teak"]}`
  are the same criterion and will carry the same key; you should never have to know why.
- **A definition with `quantity: 0` is always present.** It is the most urgent row in the
  report. Do not filter it out as empty.
- **Query parameters are ignored, not rejected.** Sending `?states=...` returns the same full
  payload, not a 400. Don't rely on that as a feature — just don't send any.

## 3. ⚠ The responsibility that is now yours

This is the reason this document exists, and the owner asked specifically that it be spelled
out.

Under v1.1 the backend performed the merge. Identical category and properties in **different
stock states** stayed separate rows *by construction* — the merge had already happened
server-side, and no client could get it wrong.

Under v1.2 you do the merging. So:

> **Compact on `mergeKey` + `stockState`. Never on `mergeKey` alone.**

If you group on `mergeKey` by itself, this happens:

```
LC1 · Dining Chairs · walnut · qty 2  · low_in_stock      ⎫ same mergeKey
H1  · Dining Chairs · walnut · qty 18 · normal_in_stock   ⎭

  grouped on mergeKey alone   →  walnut chairs · qty 20 · looks healthy
  grouped on mergeKey + state →  walnut chairs · qty 2  · LOW  ← the restock signal
                                 walnut chairs · qty 18 · normal
```

The 2-at-LC1 disappears behind the 18-at-H1, and the person reading the report never learns
LC1 needs restocking. The backend intention states this as a first-class rule: *low stock in
one location must never be hidden by healthy inventory elsewhere.*

**No backend check can catch a violation of this.** We hand you correct entries; what you do
with them is invisible to us. That means it belongs in **your** measurement ledger, with a
test that would actually fail if someone dropped `stockState` from the grouping key — not a
comment, and not a code review habit. If your ledger has no entry for it after reading this,
that is the gap to close first.

The same applies, more softly, to the other four things that moved to you: state filtering,
location filtering, severity ordering, and location ranking by problem counts. The backend
intention still defines what each of those *means* (§19) — reuse those definitions rather than
inventing your own, especially the severity order and the ranking comparators, which are
enumerated there. But nothing on our side verifies them any more.

## 4. What you need to do

1. **Get v1.2.** Your copy at
   `apps/frontend/docs/under_development/stock_locations/backend_handoff/frontend-api-contract.md`
   is **still v1.1 and now wrong about §4.7.** The live file is
   `docs/under_implementation/warehouse_stock/contracts/frontend-api-contract.md` on branch
   `warehouse-stock-backend`. It has not been copied to `main` — that crossing is the owner's
   to route, deliberately, because the two tracks are on separate branches. Until it lands,
   treat this notice plus §2 above as authoritative.
2. **Add the compaction-key obligation to your ledger** (§3).
3. **Keep building against mocks.** The endpoint is real only after backend phase P5 is
   approved — unchanged from v1.1's sequencing, and P5 is now *smaller* than it was, so this
   amendment did not push it out.
4. Endpoints 4.1–4.6 (options, summary, detail, create, update, delete) are unaffected and
   still arrive after phase P3.

## 5. Two notes on how the request arrived

Neither blocked acceptance. Both are worth fixing before the next cross-track request, because
next time they might.

1. **A citation didn't resolve.** Your document cited "intention §9 D7
   (`../intention/raw_intention.md`)". From where the file sat, that path reaches the
   *backend* intention, which has no §9 D7 and no D-numbering at all. The decision actually
   lives in your own intention. That citation was carrying the load-bearing claim — *the owner
   decided this* — and it pointed at the wrong document.
2. **The document it pointed to is not ratified.** Your intention reads
   `READY_FOR_RATIFICATION`. Under the shared charter that is the shaper's claim, not the
   owner's recorded act — so the request arrived asking a *ratified* backend to change on
   *unratified* authority. It was accepted because the owner confirmed the decision directly
   in conversation, not because the paperwork carried it.

Also: the request was filed in a folder that is not one of this project's tables, so nothing
short of a manual look would have found it. It was noticed by a routine sweep, not by the
system. It now lives in this table alongside this reply. **Put future cross-track requests
here** — `docs/under_implementation/warehouse_stock/handoffs/frontend/` — and they will be
picked up rather than depended on luck.

## 6. Write perimeter of this amendment (backend side)

For your traceability, and so nothing here surprises you later: intention §26 added, §19
marked superseded for the contract, §24 M7 rewritten (ID kept), context §0.19 marked
superseded, master plan §6.5 DTO replaced and two non-findings added, plan 5 rewritten from
six criteria to three, contract reissued v1.2. No backend code exists yet — every phase is
still unstarted.
