# Dimension insights

The **Dimension insights** charts show whether the physical size of items affects how quickly they sell. This is useful when you want to understand whether certain item sizes consistently move better than others.

## What the chart is showing

- Items are grouped into fixed size buckets for **height**, **width**, **depth**, and **volume**.
- Each bucket compares how many items existed during the selected period against how many of those items were sold.
- The chart does not show a named percentage, but it visually reveals the sold-to-total ratio for each bucket.

## How the calculation works

For each size bucket, the app calculates:

```
Total = number of items in inventory with this size during the period
Sold  = number of those items that were sold during the period

Ratio = Sold ÷ Total
```

Example:

```
Height 80–120 cm
Total = 20 items
Sold = 12 items

Ratio = 12 ÷ 20 = 0.60
```

That means 60% of the items in that size bucket sold during the selected period.

## How to read it

- If one bucket has a much stronger sold-to-total balance than the others, items of that size are likely performing better in your store.
- If a bucket has many items but very few sold, that size may be harder to move or may need different placement and pricing.
- Compare buckets within the same dimension rather than comparing unrelated dimensions directly.

## A practical example

```
Height 0–40 cm   → Total 30, Sold 6
Height 80–120 cm → Total 20, Sold 12
```

Even though there were fewer tall items, they sold much more effectively. That suggests taller items may have stronger demand or better presentation in your store.

## How to use the insight

- Use it to decide which item sizes deserve more space or more frequent restocking.
- Use it to spot sizes that may be overrepresented in inventory but underperforming in sales.
- Combine it with category and zone data before making a placement decision, because size alone is not the whole story.

---

This is one of the strongest comparative tools in analytics because most stores do not track size performance explicitly.
