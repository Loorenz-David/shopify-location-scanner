import { z } from "zod";

const defaultFrom = (): Date => {
  const value = new Date();
  value.setDate(value.getDate() - 30);
  return value;
};

const parseDateRangeValue = (
  value: string | undefined,
  fallback: () => Date,
  endOfDay = false,
): Date => {
  if (!value) {
    return fallback();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback();
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return endOfDay
      ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999))
      : new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  return new Date(trimmed);
};

export const DateRangeSchema = z.object({
  from: z
    .string()
    .optional()
    .refine((value) => {
      if (value === undefined) {
        return true;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return true;
      }

      return !Number.isNaN(new Date(trimmed).getTime());
    }, "Invalid ISO datetime or YYYY-MM-DD date")
    .transform((value) => parseDateRangeValue(value, defaultFrom)),
  to: z
    .string()
    .optional()
    .refine((value) => {
      if (value === undefined) {
        return true;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return true;
      }

      return !Number.isNaN(new Date(trimmed).getTime());
    }, "Invalid ISO datetime or YYYY-MM-DD date")
    .transform((value) => parseDateRangeValue(value, () => new Date(), true)),
});

export type DateRangeInput = z.infer<typeof DateRangeSchema>;
