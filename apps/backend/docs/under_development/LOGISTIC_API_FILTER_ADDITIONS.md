# LOGISTIC API FILTER ADDITIONS

## Context

Two new query params are required on `GET /logistic/items` to support frontend
real-time updates and the seller task view.

- **`ids`** — targeted refetch of specific items by scanHistoryId after a WS event
- **`noIntention`** — seller task view showing sold items without an intention set yet

Both changes are additive (no existing behaviour changes). Run `npx tsc --noEmit`
after each step.

---

## Change 1 — `ids` filter (comma-separated scanHistory IDs)

### Purpose

When the frontend receives a WS event (`logistic_intention_set`,
`logistic_item_placed`, `logistic_item_fulfilled`) it needs to fetch only the
affected items by their `scanHistoryId`. Without this param the frontend must
re-fetch the full list, which is wasteful.

### Contract change

**`src/modules/logistic/contracts/logistic.contract.ts`**

Add to `GetLogisticItemsQuerySchema`:

```typescript
ids: z.string().optional(), // comma-separated scanHistory IDs
```

Add to inferred type (auto-derived from schema).

### Query change

**`src/modules/logistic/queries/get-logistic-items.query.ts`**

After building `where`, add:

```typescript
if (filters.ids) {
  const idList = filters.ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (idList.length > 0) {
    where.id = { in: idList };
  }
}
```

---

## Change 2 — `noIntention` filter (seller task view)

### Purpose

The seller's task page must show sold items that have not yet had an intention
set (`intention IS NULL`). The base query currently always requires
`intention IS NOT NULL`. When `noIntention=true` is passed, the base intention
guard must be inverted.

### Contract change

**`src/modules/logistic/contracts/logistic.contract.ts`**

Add to `GetLogisticItemsQuerySchema`:

```typescript
noIntention: z
  .preprocess((v) => v === "true" || v === true, z.boolean())
  .optional(),
```

### Query change

**`src/modules/logistic/queries/get-logistic-items.query.ts`**

Replace the hardcoded intention guard:

```typescript
// Before
intention: {
  not: null,
  notIn: ["customer_took_it"],
},

// After
intention: filters.noIntention
  ? null          // IS NULL — items needing their intention set
  : {
      not: null,
      notIn: ["customer_took_it"],
    },
```

> When `noIntention=true` all other intention-related filters are irrelevant.
> The `intention` filter param is already optional so no conflict arises.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `GET /logistic/items?ids=abc,def` returns only the two matching items
- [ ] `GET /logistic/items?noIntention=true` returns sold items with `intention IS NULL`
- [ ] `GET /logistic/items` (no new params) returns the same results as before

---

## Implementation Order

1. Contract additions (both params in one commit)
2. Query handler update
3. `npx tsc --noEmit`
