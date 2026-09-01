# Request case — report endpoint shape the frontend needs

**Direction:** frontend → backend (input for the backend pipeline's coordinator)
**Date:** 2026-09-01 · **Status:** CLOSED (2026-09-01 — contract v1.2 reissued, accepting R1–R5 in full; see `handoff_report_contract_v1_2_notice.md`)
**Authority context:** amends the contract at `frontend-api-contract.md` v1.1 §4.7 only; §§4.1–4.6, transport, auth, envelopes, reactivity are untouched.
**Owner decision behind this:** intention §9 D7 (`../intention/raw_intention.md`) — the owner chose to correct the backend rather than have the frontend approximate around v1.1 §4.7.

## 1. What the frontend must render (the case)

The report UI (design screens 01–05) is interactive around **one dataset**:

1. **Two groupings of the same data**, switched by a segmented control: compacted
   (cross-location merge on `itemCategory + properties + stockState`, quantities summed,
   contributing locations listed) and grouped-by-location (uncompacted).
2. **A filter sheet** over states **and locations**, whose primary CTA shows a **live
   result count** (`Show 9 entries`) that updates on every checkbox/chip/toggle tap —
   before anything is applied.
3. **Counter tiles** computed from the *unfiltered* result while a filter is active.
4. **Entry detail** for a compacted row: the per-location rows it merged, each with its
   own quantity and state.
5. **PDF export** of the currently filtered/grouped view, generated client-side from
   data already in hand.

## 2. Why v1.1 §4.7 cannot serve this

- Compacted rows arrive with quantities already merged across **all** locations, and the
  endpoint accepts no location parameter → a location filter is impossible in compact
  view (the frontend cannot un-merge quantities).
- Live CTA counts and instant grouping switches would each cost a round trip
  (`states=`/`groupByLocation=` refetches), against the product goal of an instant
  filter sheet.
- The compacted and grouped payloads are two shapes of the same information; the
  frontend needs the underlying one, once.

## 3. What the frontend needs (requirements — this section is the ask)

- **R1 — One unparameterized read.** A single `GET` (path at the backend's discretion;
  reusing `/api/stock/report` is fine) returning the complete report dataset: every
  definition-backed entry, all locations, all states, **uncompacted** (one entry per
  definition, i.e. per location × category × properties). Query parameters may be
  dropped entirely; the frontend will send none.
- **R2 — Per-entry fields:** `location`, `itemCategory`, `properties` (canonical form,
  as v1.1 defines), `quantity`, `stockState`. (Exactly the fields of v1.1's grouped
  `entries`, plus `location` on the entry itself.)
- **R3 — Backend-owned merge identity.** Each entry carries a `mergeKey`: an **opaque
  string**, equal between two entries **iff** their `itemCategory` and canonical
  `properties` are equal. The frontend builds the compacted view by grouping on
  `mergeKey + stockState` (sum quantities, collect locations) and never re-implements
  property canonicalization/equality — those semantics stay backend-owned. The frontend
  will never parse the key's contents.
- **R4 — Semantics unchanged:** unit counting, exactly-one-definition matching, state
  derivation all as v1.1. The frontend applies the fixed severity order (§1) and the
  §4.7 ordering rules (worst-first; group ordering by problem counts) client-side, so
  the response's own ordering carries no meaning the frontend relies on.
- **R5 — Envelope/auth/reactivity unchanged:** `{ "data": ... }`, Bearer JWT,
  `scan_history_updated`-triggered refetch.

**Proposed shape (concrete strawman for the backend to accept or counter):**

```json
{ "data": { "entries": [
  {
    "location": "LC1",
    "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["teak"] },
    "mergeKey": "…opaque…",
    "quantity": 5,
    "stockState": "low_in_stock"
  }
] } }
```

## 4. Scale assumption (sanity check for R1)

Entries scale with **stock definitions** (tens, maybe low hundreds), not with items —
a full unparameterized fetch is small. If the backend disagrees with this assumption,
that is a finding to send back, not to absorb silently.

## 5. What the frontend takes on in exchange

Client-side, in its tested domain layer (intention M2): state filtering, location
filtering, live CTA counts, counter tiles, compaction by `mergeKey + stockState`, both
ordering rules, and the PDF's data assembly. The backend never needs `states`,
`groupByLocation`, or a location filter for this UI.

## 6. Closure

The amendment must arrive as a **new version of `frontend-api-contract.md`** through
the backend pipeline (per that contract's own amendment rule), superseding §4.7. Until
it lands, the frontend builds against mocks encoding §3's shape, with this document as
the mocks' authority (intention C2).
