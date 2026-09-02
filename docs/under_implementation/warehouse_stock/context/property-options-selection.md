# Property-Options Map — Owner Selection Sheet

Source: full scan of `prisma/dev.db` (1107 items, 2026-09-01). Every property key observed is listed.
For each key you select, the map entry becomes `{ key, values, categories }` per intention §23.3.

**How to answer:** mark each candidate key **IN (universal)**, **IN (categories: …)**, or **OUT**.
The pre-filled `Suggested grouping` column follows the real data: a key present across ~all
categories is suggested universal; a key concentrated in a few categories lists those.
Values shown are the **atomic tokens** after splitting stored strings on `,` `/` `&` (§0.5) —
these are the choices the map would carry, in canonical display casing.

## Candidates recommended IN

| Key | Atomic values (from data) | Appears in | Suggested grouping | Your call |
|---|---|---|---|---|
| `wood_type` | Beech, Birch, Cherry, Elm, Mahogany, Oak, Santos Rosewood, Teak, Walnut | 23 of 24 categories, 1044 items | **universal** | |
| `years` | 1950-1960s, 1960-1970s, 1970-1980s, 1980-1990s, Early 20th century furniture | all categories, 1060 items | **universal** | |
| `weight_definition` | 1-20 kg, 21-40 kg, 41-60 kg, 61+ kg | all categories, 1060 items | **universal** | |
| `country` | Denmark, Sweden, Germany, United Kingdom, Italy, Netherland | all categories, 1044 items | **universal** | |
| `shape` | Oval, Rectangular, Round, Square | Dining Tables only (66) | **Dining Tables** | |
| `upholstery` | Up, Down | Dining Chairs (12) + 1 Bookshelves outlier | **Dining Chairs** | |
| `extension_type` | Inside Extension, Outside Extension | Dining Tables (106), Coffee Tables (3) | **Dining Tables, Coffee Tables** | |
| `material_type` | Oak, Pine, Teak, Walnut | Sideboards, Bookshelves, Chest of Drawers, Highboards, Secretary Cabinets, Hall Tables, Bar Cabinets (32 total) | **those 7 categories** | |
| `door_type` | Opening doors, Sliding doors | Sideboards (11), Bookshelves (10), Highboards (2), Bar Cabinets (1) | **Sideboards, Bookshelves, Highboards, Bar Cabinets** | |
| `unit_type` | Single, Pair | Bedside Tables (5), Side Tables (1) | **Bedside Tables, Side Tables** | |
| `magazine_shelf` | With magazine shelf, Without magazine shelf | Side Tables (19), Coffee Tables (13), Bedside Tables (6), Sideboards (2) | **Side Tables, Coffee Tables, Bedside Tables, Sideboards** | |

## Borderline — numeric choice values, your call

| Key | Values | Appears in | Notes | Your call |
|---|---|---|---|---|
| `extension_quantity` | 1, 2, 3, 4 | Dining Tables (105), Coffee Tables (3) | small closed set; pairs naturally with `extension_type` | |
| `extensions_quantity` | 0, 1, 2, 3, 4 | near-universal (965) | 802 of 965 are `0`; unclear stock meaning vs `extension_quantity` | |
| `drawers_qty` | 2, 3, 4, 6 | Chest of Drawers (6), Hall Tables (1) | tiny sample | |
| `parts` | 0, 1, 3 | Bookshelves (9), Sideboards (1) | tiny sample, unclear meaning | |

## Recommended OUT (free text, prose, numeric measurements, pricing)

| Key | Why out |
|---|---|
| `price_st`, `compare_at_price` | prices, 184/57 distinct values |
| `detailed_condition` | 3 values but full prose sentences (`Very Good - This vintage…`); ugly as choices, substring traps |
| `damage_details`, `link`, `dimensionss`, `extension_dimension`, `height_2` | free text / measurements |
| `manufacturer` (223 distinct), `designer` (103 distinct) | unbounded free text |
| `seatheightchairs` | messy near-numeric: `47cm`, `47 cm`, `Ch:45cm`, `43-46cm` |
| `reserved`, `set_count`, `drawer_units` | internal flags / single-row keys |

## Decisions taken with this sheet (already ratified)

- Map structure and category-aware validation: intention §23.3.
- The drift-insurance script (stored values absent from the map) ships in V1 (owner, card 3).

## ✅ OWNER SELECTION — FINAL (David, 2026-09-01). This section is the authoritative map content for P1.

```
IN universal:   wood_type, years, weight_definition, country
IN "tables":    shape, extension_type, extension_quantity
IN "chairs":    upholstery
OUT:            everything else (material_type, door_type, unit_type, magazine_shelf,
                extensions_quantity, drawers_qty, parts, and all free-text/prose/price keys)
```

**Group interpretation** (owner said "table" / "chair"; resolved against `ITEM_CATEGORIES` by name — correct here if wrong):

- **tables** = `["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"]`
- **chairs** = `["Dining Chairs", "Easy Chairs", "Armchairs"]` (the categories containing "chair", same rule as the existing `isSeatingCategory` helper)

**Resulting `ITEM_PROPERTY_OPTIONS` content** (canonical display casing; atomic tokens from data):

| key | values | categories |
|---|---|---|
| `wood_type` | Beech, Birch, Cherry, Elm, Mahogany, Oak, Santos Rosewood, Teak, Walnut | universal |
| `years` | 1950-1960s, 1960-1970s, 1970-1980s, 1980-1990s, Early 20th century furniture | universal |
| `weight_definition` | 1-20 kg, 21-40 kg, 41-60 kg, 61+ kg | universal |
| `country` | Denmark, Sweden, Germany, United Kingdom, Italy, Netherland | universal |
| `shape` | Oval, Rectangular, Round, Square | tables |
| `extension_type` | Inside Extension, Outside Extension | tables |
| `extension_quantity` | 1, 2, 3, 4 | tables |
| `upholstery` | Down, Up & Down, None | chairs |

P1's gate is satisfied; the implementer transcribes THIS table into `item-property-options.ts` verbatim.

### Correction (David, 2026-09-02) — `upholstery` values

The atomic-token split (§0.5) was wrong for this key. `upholstery` is stored as one of three
whole values — `Down` (24 items), `Up & Down` (23), `None` (2) — and `&` is a word in
`Up & Down`, not a separator: no other mapped key uses `&` anywhere in the data. Splitting it
into `Up` / `Down` left `Up & Down` and `None` unselectable and silently folded the 23
`Up & Down` items into a `Down` configuration. The map now carries `Down, Up & Down, None`,
and `tokenizePropertyValue` splits on `,` and `/` only.

### Addition (David, 2026-09-02) — `quantity`

`quantity` is now a ninth map entry: values `1-10, 12`, categories `chairs`
(Dining Chairs, Easy Chairs, Armchairs). It did not appear on the sheet because it
was never in the bag — `custom.quantity` is a promoted metafield that backs the
`ScanHistory.quantity` column, so `extractMetafieldProperties` skipped it.

For a furniture shop that number is a real item attribute (the size of the set),
so the bag now carries it too. It carries the **resolved** number the column holds,
not the raw metafield: `resolveQuantity` falls back to the "set of N" in the title
for seating and then to `1`, so most items have a genuine quantity with no metafield
behind them. Storing the raw metafield would have left those items with no `quantity`
key at all, and `matchesCriteria` requires the key to be present — they would have
been invisible to every quantity criterion while the report still counted their sets.

Observed today: 1 (938 items), 2 (71), 4 (164), 5 (7), 6 (112), 7 (2), 8 (14), 10 (4).
The map adds 3, 9 and 12 so a new set size is not unconfigurable on arrival.
