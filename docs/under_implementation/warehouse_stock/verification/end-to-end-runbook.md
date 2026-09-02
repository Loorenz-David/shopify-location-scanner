# Location Stock — end-to-end verification runbook

**Run this once the backend is complete and the frontend can drive it.** It is the instrument for
intention §22.10a and plan 6's C3, and it discharges the criteria that no automated check in this
project can reach: the ones that need the running app, the webhook worker, and real item movement.

**It is self-contained.** Everything you need — setup, fixtures, exact expected numbers, and what
each step proves — is in this document. You should not need to open a plan to run it.

**Owner decision, 2026-09-01:** these checks were deferred out of phase 4's review to here,
because they are genuinely end-to-end and are far easier to drive through the finished frontend
than by hand. Phase 4's code was reviewed and found correct; what was never watched is the moment
it fires inside real flows, and that is what this runbook watches.

---

> ## Status — owner attestation, 2026-09-02
>
> **Plan 6's C3 was discharged by the product owner's own testing of the endpoints and the live
> functionality, not by a step-by-step run of this document.** The owner exercised the running
> system and approved the row on that basis.
>
> This runbook is therefore **not** a completed record. It stays committed and re-runnable, and it
> remains the right instrument whenever the behaviour needs demonstrating rather than attesting —
> a regression hunt, a handover, or the rebuild this backend is interim to. The three steps it
> covers that ordinary use is least likely to reach are §5.2 (an `orders/create` + `orders/paid`
> pair must subtract **once**), §6.1 (a refused source decrement must still let the destination
> increment), and §8's trap (a group with no catch-all legitimately sums **short**).

## 0. Before you start

### Processes

Two terminals, both from `apps/backend`. Redis is already running (`redis-cli ping` → `PONG`,
container `app-redis-1`); `REDIS_URL` is `redis://127.0.0.1:6379`.

```bash
npm run dev          # API on :4000
npm run dev:worker   # BullMQ webhook worker — REQUIRED for §4 and §5
```

Without the worker, the webhook and sale scenarios silently do nothing: jobs queue and are never
consumed. That failure looks identical to "the hook did not fire", so **confirm both processes
are up before concluding anything**.

### Which database

Several steps deliberately corrupt a counter. **Do not run this against `prisma/dev.db`.**

```bash
sqlite3 prisma/dev.db ".backup '/tmp/stock-verify.db'"       # never plain cp — WAL mode
DATABASE_URL="file:/tmp/stock-verify.db" npm run dev
DATABASE_URL="file:/tmp/stock-verify.db" npm run dev:worker  # SAME copy, or they disagree
```

Both processes must point at the same file.

### Re-derive the numbers if your data has moved

Every expected value below came from `prisma/dev.db` on 2026-09-01. If the database has changed,
re-derive rather than trusting them:

```sql
SELECT latestLocation, COUNT(*), SUM(quantity) FROM ScanHistory
WHERE isSold=0 AND itemCategory='Dining Chairs' AND latestLocation IN ('LC1','H1')
GROUP BY latestLocation;
```

**Quantities are units, not rows.** 28% of items have `quantity > 1`; a "set of 4 chairs" is one
row worth 4. Every number below is units.

---

## 1. Fixtures

Create three definitions. Through the UI, or `POST /api/stock/configurations` with a Bearer token
(any authenticated shop-linked user; no admin required). All three thresholds are mandatory and
must strictly increase — 10 / 15 / 20 throughout.

| # | Definition | Expected quantity on creation | Expected state |
|---|---|---|---|
| **A** | `LC1` · Dining Chairs · **catch-all** `{}` | **221** | `high_in_stock` |
| **B** | `H1` · Dining Chairs · **catch-all** `{}` | **80** | `high_in_stock` |
| **C** | `LC1` · Dining Chairs · `{ wood_type: ["Teak"] }` | **107** | `high_in_stock` |

**Create A and B first, check them, then create C** — C changes A, and you want to see that
happen.

**Step 1.1 — creation counts existing inventory.** A must come back **221** and B **80**,
*already counted*, not 0. A definition that starts at zero and waits for movement is the single
most likely thing to be wrong, and it is wrong in a way that looks calm.

**Step 1.2 — adding a narrower definition moves items off the broader one.** After creating C:

- C = **107** (the teak chairs)
- **A drops 221 → 114** — the same chairs, now claimed by the more specific definition

If A stays at 221 you have double-counting: every teak chair is being counted twice, and the
total across the location now exceeds what is physically there.

**Step 1.3 — the audit column.** All three should read **your username**, not
`system:stock-reconciliation`. The recount that set those quantities runs under the system name;
the definition you created should still be attributed to you.

---

## 2. Movement — the scanner path

Use a **single-unit** chair at LC1:

```
gid://shopify/Product/15150508966218
gid://shopify/Product/15343178809674
gid://shopify/Product/15597402685770
```

**Step 2.1 — move one chair LC1 → H1.** Whether it lands on A or C depends on its wood; check
which definition holds it first, then:

- source −1, destination (B) **80 → 81**
- both states recalculated

**Step 2.2 — rescan the same chair to H1 again.** **Nothing moves.** Same-location rescans are
short-circuited before any event is written; if a number changes here, the hook is firing on a
no-op and every repeated scan will drift the counts.

**Step 2.3 — units, not rows.** Move `gid://shopify/Product/15657227583818` (**quantity 7**) from
LC1 to H1. Source drops by **7**, destination rises by **7**. If either moves by 1, the code is
counting rows.

**Step 2.4 — move it back.** The numbers return exactly to where step 2.3 started. Movement must
be reversible without residue.

---

## 3. Return to store

Take a **sold** chair and return it through the scanner UI.

- Its destination definition **increases** by the item's quantity
- **Nothing is decremented anywhere** — it was sold, so it was already counted off; a decrement
  here would remove stock that is not there

If you see both a decrement and an increment, the sold side is being resolved when it should not
be, and every return will quietly reduce the location it came from.

---

## 4. The Shopify webhook path — worker required

**Step 4.1 — edit a chair's location in the Shopify admin** (LC1 → H1), then wait for
`products/update`.

- The counters move exactly as in step 2.1

This is the only path that proves the worker process — a different OS process from the API — also
maintains stock. If steps 2 pass and this fails, the hook is wired into the API path only.

*If you cannot reach Shopify (no tunnel to `SHOPIFY_APP_URL`):* replay a stored payload instead.
`WebhookIntakeRecord` holds ~23,000 `products/update` bodies. That exercises the same job on the
same code, and only skips the Shopify→you leg, which this feature did not change. **Record that
you substituted it** rather than marking the step passed.

**Step 4.2 — a property change that moves an item between definitions.** Change a chair's
`wood_type` in Shopify from something else to Teak, at LC1. It should leave A and join C —
**A −1, C +1, location unchanged.** This is the case where an item moves without moving, and
nothing else in this runbook covers it.

---

## 5. Sales — worker required

**Step 5.1 — sell a chair** (or replay an `orders/paid`). Its definition decreases by the item's
quantity, **once**.

**Step 5.2 — the pair.** A real sale arrives as **both** `orders/create` and `orders/paid` for
the same order, seconds or minutes apart. After both have been processed, the definition has
decreased by the item's quantity **once in total, not twice**.

This is the single most valuable step in this runbook. A double subtraction errors nowhere: the
count is simply one short, then two short, drifting down with every prepaid sale until someone
rebuilds it by hand. Re-delivering the *identical* payload is not a substitute — that is rejected
earlier by delivery de-duplication and never reaches the code this step exercises.

---

## 6. Failure isolation

**Step 6.1.** On the scratch copy, set a definition's quantity to `0` directly:

```sql
UPDATE LocationStock SET quantity = 0 WHERE id = '<definition A>';
```

Now move a chair **out of LC1 and into H1**.

- An error is logged naming the definition and the refused decrement
- **The scan itself succeeds** — HTTP 200, and `ScanHistory` shows the new location
- **H1 still increases** — the failed source decrement must not prevent the destination increment

The third point is the one people get wrong. A stock problem must never cost you a scan, and it
must not silently swallow the half of the operation that was fine.

---

## 7. Deletion and fallback

**Step 7.1 — delete definition C** (the teak one). Its chairs fall back to the broader A:
**A 114 → 221**, and no item is touched.

**Step 7.2 — delete A as well**, leaving the group with no definitions. It succeeds, throws
nothing, and no other location changes. This path is exercised nowhere else.

---

## 8. Totals check — and the trap in it

With A and B present (both catch-alls), each group's definition totals equal its true eligible
inventory, because a catch-all claims everything.

**Without a catch-all, a short total is correct, not drift.** If you delete A and leave only C,
LC1's definitions sum to 107 while the location holds 221 units. The 114 non-teak chairs are
claimed by nothing, which is legitimate. **Do not read that as a bug** — it is the one number in
this system that looks broken and is not.

---

## 9. Recording the run

For each step: what you expected, what you saw, and whether they matched. A step you could not run
is recorded as *not run, and why* — never skipped silently, and never marked passed on the grounds
that it probably works.

Paste the completed record into plan 6's Review log. Anything that does not match is a defect
routed to the phase that owns it, not fixed in place.
