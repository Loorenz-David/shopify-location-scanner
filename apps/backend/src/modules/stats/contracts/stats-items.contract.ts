import { z } from "zod";

/**
 * Volume buckets (in cm³). Shared by the contract (filter input) and the
 * dimensions stats query so both use identical thresholds.
 */
export const VOLUME_LABELS = {
  tiny:        { min: 0,           max: 50_000,    label: "Tiny" },
  small:       { min: 50_000,      max: 200_000,   label: "Small" },
  medium:      { min: 200_000,     max: 600_000,   label: "Medium" },
  large:       { min: 600_000,     max: 1_500_000, label: "Large" },
  extra_large: { min: 1_500_000,   max: null,      label: "Extra large" },
} as const;

export type VolumeLabel = keyof typeof VOLUME_LABELS;

// ---------------------------------------------------------------------------
// Re-usable primitive parsers
// ---------------------------------------------------------------------------

const optionalBoolean = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string") {
    const n = v.trim().toLowerCase();
    if (n === "true" || n === "1") return true;
    if (n === "false" || n === "0") return false;
  }
  return v;
}, z.boolean().optional());

const optionalNonNegativeNumber = z.preprocess(
  (v) => (v === undefined || v === "" ? undefined : v),
  z.coerce.number().min(0).optional(),
);

const optionalDate = z.preprocess(
  (v) => (v === undefined || v === "" ? undefined : v),
  z.coerce.date().optional(),
);

// For the upper bound of a date range, a bare YYYY-MM-DD string should cover
// the entire day — parse it as 23:59:59.999 UTC so same-date from/to works.
const optionalToDate = z.preprocess((v) => {
  if (v === undefined || v === "") return undefined;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
    const parts = v.trim().split("-").map(Number);
    const year = parts[0] as number;
    const month = parts[1] as number;
    const day = parts[2] as number;
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
  return v;
}, z.coerce.date().optional());

// ---------------------------------------------------------------------------
// Main query schema
// ---------------------------------------------------------------------------

export const StatsItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  // Date range — applied to lastModifiedAt (≈ sold date for sold items).
  // A bare YYYY-MM-DD on `to` is treated as end-of-day so that passing the
  // same date for both from and to captures the full day.
  from: optionalDate,
  to: optionalToDate,

  // Exact-match filters
  latestLocation:  z.string().trim().min(1).optional(),
  isSold:          optionalBoolean,
  itemCategory:    z.string().trim().min(1).optional(),
  lastSoldChannel: z.enum(["webshop", "physical", "imported", "unknown"]).optional(),

  // Dimension range filters (cm)
  heightMin: optionalNonNegativeNumber,
  heightMax: optionalNonNegativeNumber,
  widthMin:  optionalNonNegativeNumber,
  widthMax:  optionalNonNegativeNumber,
  depthMin:  optionalNonNegativeNumber,
  depthMax:  optionalNonNegativeNumber,

  // Volume: accept either a named label OR explicit numeric range
  volumeLabel: z.enum(["tiny", "small", "medium", "large", "extra_large"]).optional(),

  // Time-of-day / day-of-week drill-down from the time patterns chart
  hourOfDay: z.coerce.number().int().min(0).max(23).optional(),
  weekday:   z.coerce.number().int().min(0).max(6).optional(),

  // Sorting
  sortBy:  z.enum(["lastModifiedAt", "lastKnownPrice", "timeToSell", "timeInStock"]).default("lastModifiedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),

  // Group same-order items together (only meaningful when isSold = true)
  groupByOrder: optionalBoolean,
});

export type StatsItemsQueryInput = z.infer<typeof StatsItemsQuerySchema>;
