# Sales over time channels

The **Sales over time** chart can show your sales activity in three different ways. The buttons above the chart do not change the date range. They only change which channel data is shown in the timeline.

## Compare

- **Compare** is the default overview.
- It shows **physical / POS** sales and **webshop** sales as two separate lines on the same chart.
- Use this view when you want to understand which channel is driving movement during the selected period and whether one channel is growing faster than the other.

### How the chart is grouped

Each point in the line chart is built from sales recorded on that calendar day:

```
Daily items sold = Count of sold items on that date for the selected channel

Daily revenue = Sum of sold item prices on that date for the selected channel
```

Example:

```
2026-04-09
Physical sold = 3 items
Webshop sold = 7 items
```

That day will display one point at `3` for the physical line and one point at `7` for the webshop line.

## Physical

- **Physical** shows only in-store sales that were completed through the physical point of sale.
- Use this when you want to evaluate how the store floor is performing without webshop activity affecting the trend.
- This view is useful when reviewing zone placement, in-store visibility, and physical merchandising decisions.

```
Physical daily count = Count of orders classified as physical on that date
```

Example:

```
If 5 POS items were sold on April 9, the chart shows 5 for that day.
```

## Webshop

- **Webshop** shows only online sales.
- Use this when you want to understand how your digital channel is performing on its own.
- This is helpful when a product or category appears strong overall, but you need to know whether the movement is really coming from the webshop.

```
Webshop daily count = Count of orders classified as webshop on that date
```

Example:

```
If 8 webshop items were sold on April 9, the chart shows 8 for that day.
```

## How to read divergence

When the two lines separate in compare mode, the gap itself is informative:

```
Channel gap = Webshop daily count − Physical daily count
```

Example:

```
Webshop = 8
Physical = 3

Gap = 8 − 3 = 5
```

That means webshop sold 5 more items than the physical store on that day.

---

The channel buttons help you compare behaviour, not just totals. If the lines diverge, that usually means customers are responding differently in-store and online.
