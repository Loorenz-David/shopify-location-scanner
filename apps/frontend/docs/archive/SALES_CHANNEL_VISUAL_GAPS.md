# Sales Channel Visual Gaps

The sales channel backend and most of the frontend have been implemented.
Two visual gaps remain where the current UI cannot show floor vs web comparisons
as clearly as it could.

---

## Gap 1 — No side-by-side Physical + Webshop lines on the velocity chart

### What exists now

The velocity chart (`SalesTimelineChart`) shows one line at a time. The channel
toggle pills (All / Physical / Webshop) switch between views by re-fetching with
a single `salesChannel` filter. You can see either channel — but not both at once.

### What is missing

A "Compare" or dual-line mode where Physical and Webshop are overlaid on the same
chart as two separate colored lines. This is the most direct answer to the question
"are my floor and web sales trending the same way?"

### How to implement

**1 — Fetch both series in parallel when `velocityChannel === "compare"`**

In `use-analytics-page.flow.ts`, add a `useEffect` that fires when
`velocityChannel === "compare"`:

```typescript
useEffect(() => {
  if (velocityChannel !== "compare") return;
  const { from, to } = dateRange;
  Promise.all([
    getSalesVelocityApi(from, to, "physical"),
    getSalesVelocityApi(from, to, "webshop"),
  ]).then(([physical, webshop]) => {
    store.setVelocityCompareSeries({ physical, webshop });
  });
}, [velocityChannel, dateRange]);
```

Add `velocityCompareSeries: { physical: VelocityPoint[]; webshop: VelocityPoint[] } | null`
and its setter to the analytics store.

**2 — Add a `"compare"` option to the toggle pills**

```tsx
{(["all", "physical", "webshop", "compare"] as const).map((ch) => (
  <button key={ch} onClick={() => setVelocityChannel(ch)} ...>
    {ch === "compare" ? "Compare" : ...}
  </button>
))}
```

**3 — Render `SalesTimelineChart` with two `<Line>` elements**

The chart already uses Recharts `LineChart`. When `velocityChannel === "compare"`,
merge the two series by date and pass both as separate `dataKey` fields:

```typescript
// Merge helper
function mergeVelocitySeries(
  physical: VelocityPoint[],
  webshop: VelocityPoint[],
): Array<{ date: string; physical: number; webshop: number }> {
  const map = new Map<string, { physical: number; webshop: number }>();
  for (const p of physical) map.set(p.date, { physical: p.itemsSold ?? 0, webshop: 0 });
  for (const w of webshop) {
    const row = map.get(w.date) ?? { physical: 0, webshop: 0 };
    row.webshop = w.itemsSold ?? 0;
    map.set(w.date, row);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}
```

Then in `SalesTimelineChart` (or a new `SalesTimelineCompareChart`):

```tsx
<Line type="monotone" dataKey="physical" stroke="#22c55e" name="Physical" dot={false} />
<Line type="monotone" dataKey="webshop"  stroke="#6366f1" name="Webshop"  dot={false} />
```

**Files to touch**

| File | Change |
|------|--------|
| `analytics.store.ts` | Add `velocityCompareSeries`, `setVelocityCompareSeries` |
| `analytics.store.ts` | Extend `velocityChannel` type to include `"compare"` |
| `use-analytics-page.flow.ts` | Add compare effect |
| `SalesTimelineChart.tsx` | Accept optional `compareSeries` prop, render two lines |
| `AnalyticsPage.tsx` | Add "Compare" pill; pass `compareSeries` when active |

---

## Gap 2 — SalesChannelChart has no metric toggle (always items sold)

### What exists now

`SalesChannelChart` receives a `metric` prop (`"itemsSold" | "totalRevenue"`) but
`AnalyticsPage.tsx` hard-codes `metric="itemsSold"`. There is no UI control to
switch to revenue.

### What is missing

A toggle above the chart so the user can switch between "Items sold" and "Revenue"
views for the channel breakdown.

### How to implement

**1 — Add local state (or store field) for the active metric**

The simplest option is local component state inside `AnalyticsPage`:

```typescript
const [channelMetric, setChannelMetric] =
  useState<"itemsSold" | "totalRevenue">("itemsSold");
```

**2 — Render toggle pills above the chart**

```tsx
{analyticsStore.channelOverview.length > 0 && (
  <div className="px-4 pb-3">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-500">Sales by channel</p>
      <div className="flex gap-1">
        {(["itemsSold", "totalRevenue"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setChannelMetric(m)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              channelMetric === m
                ? "bg-indigo-600 text-white border-indigo-600"
                : "text-gray-500 border-gray-200"
            }`}
          >
            {m === "itemsSold" ? "Items" : "Revenue"}
          </button>
        ))}
      </div>
    </div>
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <SalesChannelChart
        data={analyticsStore.channelOverview}
        metric={channelMetric}
      />
    </div>
  </div>
)}
```

**3 — Format revenue values in the chart tooltip**

In `SalesChannelChart`, the `<Tooltip>` formatter should prepend the currency
symbol when metric is revenue:

```tsx
<Tooltip
  formatter={(value: number) =>
    metric === "totalRevenue"
      ? [`€${value.toFixed(2)}`, "Revenue"]
      : [value, "Items sold"]
  }
/>
```

**Files to touch**

| File | Change |
|------|--------|
| `AnalyticsPage.tsx` | Add `channelMetric` state, toggle pills, pass to chart |
| `SalesChannelChart.tsx` | Add Tooltip formatter for currency |

---

## Summary

| Gap | Effort | Impact |
|-----|--------|--------|
| Dual-line velocity compare | Medium — new store field, merge helper, chart variant | High — clearest way to see floor vs web trend |
| Channel chart metric toggle | Small — local state + two pills | Medium — useful for revenue-heavy stores |
