# Smart insights

At the top of analytics, the app automatically highlights a small number of important patterns from your current data. These insight cards are meant to point your attention to something worth understanding, not to make the decision for you.

## How to read the insight colours

- **Positive** means something is performing well right now. A zone may be outperforming the rest of the store, items may be turning faster than average, or a sales channel may be showing stronger momentum.
- **Warning** means something needs attention. A zone may have gone quiet, an area may have no sales, or a pattern may look weaker than expected.
- **Neutral** means the system is giving you context. These insights are usually comparisons or ratios that help you understand what is happening without judging it as good or bad.

## What a smart insight can mean

- A message like **"Shelf A is your best performing zone with 24 items sold."** usually means that physical part of the store is contributing more than other zones during the selected period.
- A message like **"Items sell 35% faster in Shelf A than average."** suggests this area has stronger turnover than the store baseline and may be a good place for new arrivals or priority stock.
- A message like **"Shelf C had no sales in this period. Consider reorganising."** usually means that location deserves a closer look. Visibility, assortment, or placement may be limiting movement there.
- A message like **"Webshop sold 2.3x the volume of physical locations in this period."** means your online channel is currently outpacing the store floor. That can reflect a strong digital channel, but it can also reveal an in-store opportunity.

## How some smart insights are calculated

The insight cards are generated from the same numbers used elsewhere in analytics. A few of the most useful ones follow simple comparison formulas.

### "X% faster"

This compares the top zone's average sell time with the store-wide average sell time:

```
Store avg sell time = Sum of (avg sell time × items sold) for every zone
                      ÷ Total items sold across all zones

Faster % = (Store avg − Zone avg) ÷ Store avg × 100
```

Example:

```
Store avg = 10 days
Zone avg = 6.5 days

Faster % = (10 − 6.5) ÷ 10 × 100 = 35%
```

That means items from that zone are selling 35% faster than the store average.

### "Webshop sold X× the volume"

This compares sold item count across channels:

```
Ratio = Webshop items sold ÷ Physical items sold
```

Example:

```
Webshop sold = 23 items
Physical sold = 10 items

Ratio = 23 ÷ 10 = 2.3x
```

That is what produces an insight like `Webshop sold 2.3x the volume of physical locations in this period.`

### "Best performing zone"

This insight comes from the zone ranking by physical items sold:

```
Items Sold (zone) = Count of physical sales where the item's last known position
                    was inside that zone
```

Example:

```
Shelf A = 24
Shelf B = 19
Shelf C = 12
```

That makes Shelf A the highest-performing zone for the selected period.

## How to act on an insight

- Use a **positive** insight to reinforce what already works. Keep strong zones visible, place important stock there first, and learn what makes that area effective.
- Use a **warning** insight to investigate before changing too much. Check the exact zone, category, or time period in the rest of analytics and confirm whether the pattern is temporary or consistent.
- Use a **neutral** insight as context when making decisions elsewhere on the page. It may explain why a chart looks unbalanced or why one channel is dominating another.

---

These insights are starting points. The card tells you where to look next, and the rest of the analytics page helps you decide what to do.
