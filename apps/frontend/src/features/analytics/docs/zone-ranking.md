# Zone ranking

The **Zone ranking** chart compares your store zones against each other during the selected date range. It helps you see which physical areas are driving the strongest results and which areas may need attention.

## How the ranking is calculated

- Every zone is measured from the same event history used across analytics.
- The ranking uses the current date range at the top of the analytics page.
- The chart sorts zones from highest to lowest based on the metric you selected.

### Items formula

```
Items Sold (zone) = Count of physical sales where the item's last known position
                    was inside this zone
```

Example:

```
Shelf A = 24 sold items
Shelf B = 17 sold items
Shelf C = 9 sold items
```

The ranking becomes: `Shelf A`, then `Shelf B`, then `Shelf C`.

### Revenue formula

```
Revenue (zone) = price of item 1 + price of item 2 + ... + price of item N
                 (physical sales only, for items whose last known position was in this zone)
```

Example:

```
Shelf A sales = 499 kr + 799 kr + 1200 kr = 2498 kr
Shelf B sales = 3200 kr
```

Even if Shelf A sold more items, Shelf B ranks higher in revenue because the total value is larger.

## Items

- **Items** ranks zones by how many individual items were sold from that physical area.
- This view tells you where products are physically moving fastest.
- It is usually the best choice when you are thinking about turnover, visibility, and placement performance.

## Revenue

- **Revenue** ranks zones by the total value sold from that physical area.
- This view tells you where the highest-value sales are happening.
- It is useful when a zone may sell fewer items, but those items are worth more.

## What you can derive from it

- A high-ranking zone is often a strong place for priority stock, featured items, or categories you want to push.
- A low-ranking zone may need better visibility, a different assortment, or a layout change.
- If the **Items** and **Revenue** rankings differ, that usually means some zones move many low-value items while others move fewer but more valuable items.

### A practical reading example

```
Shelf A = 12 items sold, 2,000 kr
Shelf B = 6 items sold, 3,400 kr
```

In this case:

- **Items** ranking says Shelf A moves products faster.
- **Revenue** ranking says Shelf B produces higher-value sales.

That tells you the two shelves are strong in different ways.

## How to use the chart

- Use **Pie** when you want a quick sense of how the total ranking is distributed across zones.
- Use **Bar** when you want to compare exact relative differences more clearly.
- Tap a zone from the chart to open its detail view and inspect the underlying stats for that area.

---

Zone ranking is a comparison tool. It tells you which physical areas are strongest during the selected period, so you can decide where to place products and which zones deserve investigation.
