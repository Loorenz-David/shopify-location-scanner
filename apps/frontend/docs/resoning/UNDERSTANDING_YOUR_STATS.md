# Understanding Your Store Stats

This document explains what the analytics in the application track, how the numbers
are calculated, and most importantly — how to read them so you can make better
decisions about your store.

No technical knowledge is needed to understand this.

---

## How the data gets in

Every time a staff member scans an item and places it at a location, the system
records that movement. Every time a Shopify order is paid, the system records that
sale. These two streams of events — **location scans** and **sold orders** — are
the raw material behind every number you see.

Think of it like a logbook. Each entry says:

- What item
- What happened (moved to a shelf / sold)
- When
- Who did it (or which channel sold it)

All stats are calculated from that logbook. Nothing is estimated or guessed.

---

## The store map

The store map is a visual representation of your physical space. Each colored
rectangle on the map is a **zone** — a shelf, a section, a display area, or a
walkway (corridor).

**Zones** are the shelving and display areas where items live. They are heat-colored:

- 🟢 **Green** — high sales in this area
- 🟡 **Amber** — moderate sales
- 🔴 **Red** — low sales
- ⬜ **Gray** — no sales data yet

**Corridors** are walkways between zones. They are shown in a subtle dark color and
have no stats — they are only there to help you read the map.

The darker the background, the more that area is "outside" the store — walls, pillars,
space that doesn't exist. The map is shaped entirely by where you draw the rectangles.

Tap any zone to open its detail panel.

---

## Zone stats — what they measure

When you tap a zone, you see four key numbers:

### Items Sold
How many individual items that last lived in this zone were sold during the selected
time period.

**Important:** this only counts items sold at a physical point of sale or POS terminal.
Online (webshop) sales are not included here. This is intentional — the zone stat
answers the question *"how is this physical space performing as a selling area?"*
An online sale happens because the customer found the product on your website, not
because of how you arranged your shelves.

### Revenue
The total value of those physically sold items, in the currency of your Shopify store.

### Avg Sell Time
The average number of days (or hours) between when an item was scanned into this
zone and when it was sold. A short sell time means items move quickly from this
location. A long sell time may mean the location gets less foot traffic, or the
items placed there are harder to sell.

### Items Received
How many items were scanned into this zone during the selected period. Compare this
to Items Sold to understand turnover. If you received 20 items and sold 18, that zone
has strong throughput. If you received 20 and sold 2, items are sitting.

---

## Category performance inside a zone

Inside the zone detail panel you will see a breakdown by category — for example,
Tables, Chairs, Lamps. This shows which types of items sell best from that specific
location.

Use this to answer: **"What should I put in this spot?"**

If Tables consistently sell the most from Shelf A, that shelf is a good home for
tables. If Lamps sell slowly from Shelf A but quickly from Shelf C, move the lamps.

---

## Zone ranking

The zone comparison chart ranks all your zones from highest to lowest by either
items sold or revenue. Use the toggle to switch between the two views.

- **Items sold** ranking tells you where items physically move fastest.
- **Revenue** ranking tells you where the most valuable items sell from.

These two rankings can differ. A zone might sell many cheap items (high items sold,
lower revenue) while another zone sells fewer but more expensive pieces (lower items
sold, higher revenue). Both views are useful depending on what you are optimising for.

---

## Sales over time

The sales velocity chart shows you daily sold counts or revenue over your selected
date range. Look for:

- **Upward trends** — sales increasing over time. Something is working.
- **Downward trends** — sales slowing. Worth investigating.
- **Spikes** — a single day with unusually high sales. Often correlates with a
  promotion, an event, or a large order.
- **Flat lines** — consistent but not growing. Stable but may have a ceiling.

You can filter this chart by channel:

- **All** — every sale regardless of how it happened
- **Physical** — only in-store and POS sales
- **Webshop** — only online orders

Comparing physical and webshop trends side by side can tell you whether your in-store
and online businesses are growing at the same pace or diverging.

---

## Sales by channel

The channel breakdown chart shows the split between how items are being sold:

- **Physical / POS** — sold in person at your store. This includes Zettle card payments and Shopify POS terminal sales. When a Zettle payment is processed it is automatically recognised as a physical sale.
- **Webshop** — sold through your Shopify online store
- **Imported** — sales imported from an external system not directly integrated
- **Unknown** — the sale channel could not be determined

A healthy balance depends on your business model. If you are primarily a physical
store, most sales should appear in Physical / POS. If you are growing your online
presence, you would expect Webshop to grow over time.

If Unknown is large, it may indicate that some sales are coming through channels that
are not yet fully tracked — worth investigating with your system administrator.

---

## Categories overview

The categories section shows all your item categories ranked by average time to sell.
A short bar means items in that category sell quickly. A long bar means they sit longer.

Below the chart, each category row shows:
- How many items in that category were sold
- Which zone produced the best sales for that category

Tap any category to open the category detail panel.

---

## Category deep dive

When you tap a category, you see a breakdown of that category's performance by
location. This answers: **"Where should I place this type of item?"**

For example, if Tables sell 12 units from Shelf A and only 2 from Shelf B, the data
suggests that Shelf A is the better location for tables — perhaps because of foot
traffic, visibility, or lighting.

Use this to make deliberate placement decisions rather than relying on habit.

---

## Dimension insights

The dimension charts show whether the physical size of items affects how quickly they
sell. Items are grouped into size buckets by height, width, depth, and volume.

Each bar shows two values side by side:
- **Total** — how many items of that size were in your inventory during the period
- **Sold** — how many of those items were sold

If tall items (80–120 cm) show a much higher sold-to-total ratio than short items
(0–40 cm), that tells you taller items move faster from your store. You might choose
to stock more tall items, or to give them more prominent placement.

This is one of the more powerful insights in the system because most stores never
track size as a performance dimension.

---

## Smart insights

At the top of the analytics page, the system automatically generates a small number
of insight messages. These are computed from the same data as all the other charts —
no manual input is required.

Each insight is colour-coded to indicate its nature:

- **Positive (green)** — something is working well. A zone is performing above average,
  items are moving quickly, or a channel is growing. Reinforces decisions you should
  keep making.
- **Warning (amber)** — something needs attention. A zone has gone quiet, an area has
  no sales, or a pattern looks unusual. Not an alarm — just a prompt to investigate.
- **Neutral (grey)** — context or comparison, neither good nor bad. For example, a
  ratio between webshop and physical volume. Useful background information.

Examples of what these insights might say:

- *"Shelf A is your best performing zone with 24 items sold."*
  → Your highest-performing physical area during the selected period.

- *"Items sell 35% faster in Shelf A than average."*
  → This zone has notably faster turnover than your store average. It may be worth
  placing new stock here first, or putting items that need to move quickly here.

- *"Shelf C had no sales in this period. Consider reorganising."*
  → This zone produced zero physical sales. It may have low visibility, poor placement,
  or items that do not suit that location.

- *"Webshop sold 2.3x the volume of physical locations in this period."*
  → Your online channel is significantly outperforming your physical floor. This could
  mean your online presence is strong, or it could indicate an opportunity to improve
  in-store experience.

These are starting points, not conclusions. The insight tells you *where to look* —
you decide what to do.

---

## The scan history list

The scan history list shows every item the system has ever seen, along with its full
movement history. Each item shows:

- Its current or last known location
- Whether it has been sold
- If sold, a badge showing how it was sold (POS, Webshop, Imported)

You can filter the list by:

- **Status** — in-store vs sold
- **Sales channel** — see only webshop-sold items, or only POS items
- **Date range** — focus on a specific period
- **Search** — find items by title, SKU, barcode, category, or location

The timeline inside each item record shows the full life of that item in your store —
every location it visited, when it arrived, and when it left.

---

## Selecting a date range

All analytics respond to the date range selector at the top of the page. The presets
are 7 days, 30 days, and 90 days, measured backwards from today.

A few guidelines:

- **7 days** is useful for understanding what happened this week — good for operational
  decisions like restocking or rearranging.
- **30 days** gives a monthly view — good for comparing zones and categories.
- **90 days** reveals seasonal patterns and longer-term trends.

When you change the date range, every chart and number on the page updates at the
same time.

---

## How each number is calculated

This section explains the exact formula behind every stat in the system.
No technical knowledge is required — think of these as recipes.

---

### Items Sold (zone)

> Count of physical sales where the item's last scanned location was inside this zone.

Every time a Shopify order is paid and classified as **physical** (Zettle, POS terminal),
the system adds 1 to the items sold counter for the zone where that item was last seen.
Webshop sales are not counted here.

---

### Revenue (zone)

> Sum of the sale price of every physically sold item that last lived in this zone.

The price comes directly from the Shopify order line item. It is added to the zone's
running revenue total on the day the order was paid.

```
Revenue = price of item 1 + price of item 2 + ... + price of item N
          (physical sales only, for items last seen in this zone)
```

---

### Avg Sell Time (zone and category)

> Average number of seconds between when an item arrived at a location and when it was sold.

When an item is sold, the system looks at the most recent scan event for that item —
the last time a staff member placed it somewhere. The gap between that scan and the
sale timestamp is the **time to sell** for that item.

```
Time to sell (one item) = Sale timestamp − Last scan timestamp

Avg Sell Time = Total seconds across all sold items ÷ Number of items sold
```

If an item was never scanned before being sold, its time to sell is recorded as zero
and does not distort the average.

The number is stored in seconds internally and displayed as days or hours in the app
depending on the magnitude.

---

### Items Received (zone)

> Count of scan events where a staff member placed an item into this zone.

Every time the scanner app records a location update — staff scans an item and assigns
it to a shelf or area — the received counter for that zone increases by 1.

```
Items Received = number of scan-in events recorded for this zone in the period
```

---

### Sell-through rate (implied)

The zone stats panel does not show this as a named number but you can calculate it
yourself from Items Sold and Items Received:

```
Sell-through = Items Sold ÷ Items Received × 100  (as a percentage)

Example: 18 sold ÷ 20 received × 100 = 90% sell-through
```

A high sell-through means almost everything placed here was sold. A low sell-through
means items are sitting.

---

### Category avg sell time

Same formula as the zone avg sell time, but grouped by item category instead of
location. Items from all zones are pooled together and averaged within each category.

```
Category Avg Sell Time = Total seconds for all sold items in this category
                         ÷ Number of items sold in this category
```

---

### Dimension sold-to-total ratio

> For each size bucket, how many items were sold compared to how many existed.

Items are grouped into fixed size ranges (e.g. height 0–40 cm, 40–80 cm, etc.).
For each bucket the chart shows:

```
Total = number of items in inventory with this size during the period
Sold  = number of those items that were sold during the period

Ratio = Sold ÷ Total  (not shown as a number — visible as bar height comparison)
```

---

### Smart insight — "X% faster"

```
Store avg sell time = Sum of (avg sell time × items sold) for every zone
                      ÷ Total items sold across all zones

Faster % = (Store avg − Zone avg) ÷ Store avg × 100
```

This insight only appears when the top zone is more than 20% faster than the
store average, so it reflects a meaningful difference rather than noise.

---

### Smart insight — "Webshop sold X× the volume"

```
Ratio = Webshop items sold ÷ Physical items sold
```

Shown only when both channels have at least one sale in the period.

---

## A note on historical data

If items were sold before this system was fully set up, some records may show channel
as "Unknown." This is expected and does not affect any future records. From the moment
the channel tracking was activated, every new sale is correctly classified.

Similarly, if an item was sold before it was ever scanned into a location, the system
records it as coming from "unknown position." It still appears in your sold counts and
revenue — it just cannot be attributed to a specific zone.

---

## Summary — questions the system can answer

| Question | Where to look |
|----------|--------------|
| Which area of my store sells the most? | Zone ranking chart |
| Which area sells the fastest? | Zone detail → Avg Sell Time |
| What should I put in a specific spot? | Zone detail → Category performance |
| Where should I place a specific type of item? | Category deep dive → by location |
| Are taller / larger items selling better? | Dimension insights |
| How are online vs in-store sales trending? | Velocity chart → channel toggle |
| How much of my revenue is online vs physical? | Sales by channel chart |
| Is a specific item still in the store? | Scan history list → search |
| How long did this item sit before selling? | Scan history item → timeline |
