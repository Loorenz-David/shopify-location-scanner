# 08 — New / Edit stock instance · step 1

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Form hierarchy is strict: **Location → Item Type → Properties → Thresholds**. Steps 1–3 here; thresholds on screen 09. Two-segment progress bar under the header; × discards.

## Elements
1. **Location** — numbered green step marker + mono eyebrow. Three cards (code + zone name); selected card is solid `#0E8A5F` with white text. Preselected and headed `Step 1 of 2 · from L1` when entered from screen 07; an empty required choice when entered from screen 06.
2. **Item type** — single-select row, white card, chosen value at 17/600 with a chevron; helper line gives the number of available item types.
3. **Properties** — optional (marked so). Each chosen property is a row inside one card: property definition name as a mono uppercase 11px label, value at 15/600 beneath, 26px × to remove, hairline between rows. `Add property` is a dashed 18px-radius button in primary green; it opens the definition picker, then that definition's values. Helper line states the consequence of leaving it empty: the thresholds apply to every item of that type in the location.

## Elements — footer
Single primary CTA `Next · thresholds` over a fade; 108px bottom inset.

## Rules
- Multiple properties and their values may be selected; each definition appears at most once.
- Location and item type are required; properties are not.
