---
plan: 3
role: frontend-notice
direction: backend → frontend
round: 0
state: DELIVERED
verdict: CORRECTION
date: 2026-09-01
actor: backend pipeline coordinator (Claude Opus)
answers: handoffs/frontend/handoff_item_categories_confirmation.md
---

# Not nine — twenty-eight. Contract reissued as v1.3.

**Your assumption is wrong, you were right to ask, and the cause was a defect in our contract,
not a mistake in your reasoning.** `itemCategories` is a static list of **28** values. The nine
you derived are only the categories that happen to carry a *category-specific* property; the
other 19 carry none, which is normal and is not an omission.

Contract **v1.3** writes the list out in full. Nothing else changed.

## The complete list, in payload order

```
Dining Chairs · Easy Chairs · Armchairs · Sofas · Stools · Seating Benches ·
Serving Trolleys · Dining Tables · Bedside Tables · Coffee Tables · Side Tables ·
Hall Tables · Writing Desks · Nest Of Tables · Sideboards · Highboards ·
Bookshelves · Shelving Units · Chest of Drawers · Secretary Cabinets ·
Bar Cabinets · Wardrobes · Storage Cabinets · Posters · Mirrors · Porcelain ·
Carpets · Lamps
```

**It is static, not dynamic** — you raised that as the alternative shape, and it is worth
answering directly. This is an `as const` array in backend code, returned verbatim with no
database query and no Shopify call. It does not vary by shop and does not grow on its own. The
shape the contract describes is the shape it is.

One value is deliberately absent: the sentinel `"unknown"`. Items land on it when their Shopify
product type matches nothing, and it is excluded from the vocabulary on purpose — no stock
definition can be created for it, and such items are counted by no definition at all.

## What your nine would have cost

Not abstract. Against the current data, the 19 categories your list omits hold **152 unsold
units**, the largest being:

| Category | Unsold units |
|---|---|
| Sideboards | 41 |
| Mirrors | 19 |
| Chest of Drawers | 17 |
| Secretary Cabinets | 14 |
| Highboards | 14 |
| Bookshelves | 13 |
| Bar Cabinets | 7 |

A wizard offering only the nine would make those categories permanently unconfigurable — and
silently, because nothing errors. The user simply never finds `Sideboards` in the dropdown and
has no way to learn why. That is exactly the failure your question caught before it shipped.

## Why the inference was reasonable, and where it went wrong

The property table's `categories` column answers *"which categories get this extra property?"*,
not *"which categories exist?"* Only the six table types and the three chair types have any
category-specific property; everything else is configured with the four universal keys alone. So
the column is a strict subset of the vocabulary by construction, and reading it as the whole set
under-counts by 19 — invisibly, because the nine it yields are all real.

**The root cause is ours.** §4.1's example payload wrote `["Dining Chairs", "Easy Chairs", ...]`
with a literal ellipsis, while the section immediately below it advertised itself as "the exact
payload content, safe to hardcode in mocks". That combination invited precisely the inference you
made. A contract that elides a closed vocabulary while claiming to be exact is a defect in the
contract, and it is now fixed here and prevented for future versions (see below).

## What to change on your side

By your own note, exactly two things: standing rule S4a, and the one mock fixture. Nothing else
depends on it.

Two things worth checking while you are in there, both consequences of the list being three
times longer than assumed:

1. **Any wizard screen already approved against a nine-item dropdown** now shows 28. If the
   category step was designed as a short scrollable list, 28 may want search or grouping — a
   visual decision, yours to make, but better made now than at integration.
2. **Twenty-two of the 28 categories will show only the four universal properties** on the next
   step. If the property step assumes at least one category-specific key, that assumption breaks
   for the majority of categories.

## Process change this earned

The contract now carries a standing rule: **no closed vocabulary in it is ever elided.** Every
enumerable list is written out in full, and `...` is not used in an example payload that any
section describes as exact. v1.3 is the first version audited against that rule.

Your request was also the model of how to send one: self-contained citations that did not
require reading your documents, an explicit statement of what you assumed and why, and a clear
"if the answer is X we do nothing, if it is Y here is exactly what changes". It took minutes to
answer because of that. Please keep sending them this way.

## Delivery

v1.3 lives at `docs/under_implementation/warehouse_stock/contracts/frontend-api-contract.md` on
branch `warehouse-stock-backend`. As with v1.2, **crossing branches is the owner's to route** —
the backend pipeline does not write into `apps/frontend/`. Until it lands on `main`, this notice
plus the list above is authoritative.

Endpoint availability is unchanged: 4.1–4.6 after backend phase P3, the report after P5.
