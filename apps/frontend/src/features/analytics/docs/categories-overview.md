# Categories overview

The **Categories** chart compares item categories by how quickly they sell. It helps you understand which types of products move fastest and which ones tend to stay in stock longer.

## What the chart is showing

- Categories are compared using **average sell time** and sold activity from the selected date range.
- A shorter average sell time means items in that category tend to move quickly.
- A longer average sell time means items in that category usually stay in stock for longer before selling.

## How average sell time is calculated

The app measures the time between the item's last known position and the moment it was sold.

```
Time to sell (one item) = Sale timestamp − Timestamp when the item was last placed in its known position

Category Avg Sell Time = Total seconds for all sold items in this category
                         ÷ Number of items sold in this category
```

Example:

```
Chair 1 = 2 days
Chair 2 = 4 days
Chair 3 = 6 days

Category Avg Sell Time = (2 + 4 + 6) ÷ 3 = 4 days
```

That means the `Chairs` category takes 4 days on average to sell.

## What the row values mean

Each category row under the chart adds context:

- **Items sold** tells you how many items in that category were sold during the selected period.
- **Best zone** shows which store zone produced the strongest sales for that category.

Example:

```
Dining chairs = 12 sold · best: Shelf A
```

That means 12 dining chairs sold during the selected period, and Shelf A was the strongest physical location for them.

## What you can derive from it

- A category with a short average sell time and a healthy sold count is usually a strong performer.
- A category with a long average sell time may need different placement, pricing, or less floor exposure.
- If a category sells well but mostly from one zone, that can guide where similar stock should be placed in the future.

## How to use the chart

- Use **Pie** when you want a quick sense of how much sold volume each category contributes.
- Use **Bar** when you want a clearer ranked comparison.
- Tap a category to open its detail panel and inspect how that category performs across locations.

---

This chart helps answer two practical questions: **which kinds of items move fastest**, and **where those categories perform best**.
