import { z } from "zod";

export const ScheduleOrderItemsInputSchema = z.object({
  shopId: z.string().trim().min(1),
  orderId: z.string().trim().min(1),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
    .transform((value) => new Date(value))
    .refine(
      (value) => !Number.isNaN(value.getTime()),
      "scheduledDate is not a valid date",
    ),
});

export type ScheduleOrderItemsInput = z.infer<
  typeof ScheduleOrderItemsInputSchema
>;
