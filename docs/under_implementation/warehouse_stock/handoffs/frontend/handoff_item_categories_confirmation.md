---
from: frontend track (stock-locations implementation)
to: backend track (warehouse_stock)
date: 2026-09-01
state: CONSUMED — answered by handoff_item_categories_answer.md (contract v1.3)
subject: The `itemCategories` list in GET /api/stock/options is elided in the contract
---

# Request — confirm the item-category vocabulary

> **CONSUMED 2026-09-01. Answer: NOT the nine — twenty-eight.** The inferred list was a strict
> subset; 19 categories carry no category-specific property and so never appear in the column it
> was derived from. Root cause was ours: §4.1 elided the vocabulary with a literal `...` while
> the section below claimed to be exact. Contract reissued **v1.3** with the list written out,
> plus a standing no-elision rule. Full answer, impact measurement (152 unsold units would have
> been unconfigurable) and two follow-on UI consequences:
> `handoffs/frontend/handoff_item_categories_answer.md`.



## What this is about

The frontend is building the stock-configuration wizard against mock data, ahead of the
live endpoints. The wizard's first step makes the user pick an **item category** before
anything else, so the mock must contain that list.

## The gap

In the frontend's copy of the API contract (`frontend-api-contract.md`, **v1.2**), the
example payload for `GET /api/stock/options` gives `itemCategories` as:

```json
"itemCategories": ["Dining Chairs", "Easy Chairs", ...]
```

The `...` is literal — the list is elided. The section's "final vocabulary" table
immediately below it is complete for all **eight property keys** and explicitly says of
itself that it is "the exact payload content, safe to hardcode in mocks" — but that table
describes `propertyOptions`, not `itemCategories`. So the property vocabulary is closed and
the category vocabulary is open.

## What we assumed, and why

Rather than invent names, we took **only the categories already written down in the
contract** — every value appearing in the final vocabulary table's `categories` column.
That yields exactly nine, and we use them in the contract's own order (the six table types
bound to `shape` / `extension_type` / `extension_quantity`, then the three chair types
bound to `upholstery`):

1. Dining Tables
2. Bedside Tables
3. Coffee Tables
4. Side Tables
5. Hall Tables
6. Nest Of Tables
7. Dining Chairs
8. Easy Chairs
9. Armchairs

Decided by the frontend owner (David) on 2026-09-01. Recorded on our side as standing rule
S4a in
`apps/frontend/docs/under_development/stock_locations/master_plan.md`
(branch `main`), and asserted by an acceptance criterion in that project's phase-1 plan.

## What we are asking

**Is the real list exactly these nine, or longer?**

- If **exactly these nine** — no action needed; reply and we close this.
- If **longer** — send the complete list. On our side that changes exactly two things: the
  S4a rule and one mock fixture. Nothing else depends on it.

## Why it matters, and why it is not urgent

Not blocking: the frontend is mock-first and these endpoints do not go live until after
backend phase P3. But every wizard screen the owner visually approves between now and then
shows this list, and a mismatch discovered at live integration means re-approving screens
rather than editing a fixture.

If the category vocabulary is meant to be dynamic (derived from actual Shopify product
types rather than a static list), say so — that is a different shape than the contract
currently describes, and we would rather learn it now than at integration.

## Self-contained citations

Per the process lesson recorded in our intention's round-6 changelog, citations here are
self-contained and do not require reading our documents:

- The elision is at `frontend-api-contract.md` §4.1, in the JSON example block, on the
  `itemCategories` line.
- The nine names above are transcribed from the `categories` column of the "Final
  vocabulary (owner-selected, v1.1)" table in that same §4.1.
- No frontend document is authority for anything in this request; the contract is.
