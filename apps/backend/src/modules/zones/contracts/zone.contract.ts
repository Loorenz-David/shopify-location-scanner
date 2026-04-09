import { z } from "zod";

export const CreateZoneSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(["zone", "corridor"]).default("zone"),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0.1).max(100),
  heightPct: z.number().min(0.1).max(100),
  sortOrder: z.number().int().default(0),
});

export const UpdateZoneSchema = CreateZoneSchema.partial();

export const ReorderZonesSchema = z.object({
  zones: z.array(
    z.object({
      id: z.string().trim().min(1),
      sortOrder: z.number().int(),
    }),
  ),
});

export type CreateZoneInput = z.infer<typeof CreateZoneSchema>;
export type UpdateZoneInput = z.infer<typeof UpdateZoneSchema>;
export type ReorderZonesInput = z.infer<typeof ReorderZonesSchema>;
