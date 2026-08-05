import { z } from "zod";

export const ScheduleOrderItemsInputSchema = z.object({
  orderId: z.string().trim().min(1),
  scheduledDate: z.union([
    z.literal("").transform(() => null),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
      .transform((value) => new Date(value))
      .refine(
        (value) => !Number.isNaN(value.getTime()),
        "scheduledDate is not a valid date",
      ),
  ]),
});

export type ScheduleOrderItemsInput = z.infer<
  typeof ScheduleOrderItemsInputSchema
>;

const ManagerAppItemIdentitySchema = z.enum(["article_number", "sku"]);

const parseItemIdentity = (value: unknown): Array<"article_number" | "sku"> => {
  if (value === undefined || value === null || value === "") {
    return ["article_number", "sku"];
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) as Array<"article_number" | "sku">;
};

export const ManagerAppGetItemsLocationQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  item_identity: z
    .preprocess(
      parseItemIdentity,
      z.array(ManagerAppItemIdentitySchema).min(1),
    )
    .default(["article_number", "sku"]),
});

export const ManagerAppItemTargetSchema = z
  .object({
    article_number: z.string().trim().min(1).max(120).nullable().optional(),
    sku: z.string().trim().min(1).max(120).nullable().optional(),
    needs_fixing: z.boolean().optional(),
  })
  .refine(
    (value) => Boolean(value.article_number?.trim() || value.sku?.trim()),
    {
      message: "Either article_number or sku is required",
    },
  );

export const ManagerAppPatchItemsLocationInputSchema = z
  .array(
    z.object({
      position: z.string().trim().min(1).max(120),
      item_targets: z.array(ManagerAppItemTargetSchema).min(1),
      username: z.string().trim().min(1).max(120).nullable().optional(),
    }),
  )
  .min(1);

export type ManagerAppItemIdentity = z.infer<
  typeof ManagerAppItemIdentitySchema
>;
export type ManagerAppGetItemsLocationQuery = z.infer<
  typeof ManagerAppGetItemsLocationQuerySchema
>;
export type ManagerAppItemTarget = z.infer<typeof ManagerAppItemTargetSchema>;
export type ManagerAppPatchItemsLocationInput = z.infer<
  typeof ManagerAppPatchItemsLocationInputSchema
>;

export type ManagerAppLocationItem = {
  item_article_number?: string | null;
  sku?: string | null;
  item_position: string;
};

export type ManagerAppPatchRoute = "scanner" | "logistic";

export type ManagerAppPatchTarget = {
  article_number: string | null;
  sku: string | null;
};

export type ManagerAppPatchSuccessResult = {
  status: "updated";
  position: string;
  target: ManagerAppPatchTarget;
  route: ManagerAppPatchRoute;
  scanHistoryId: string;
};

export type ManagerAppPatchFailureResult = {
  status: "failed";
  position: string;
  target: ManagerAppPatchTarget;
  errorCode:
    | "ITEM_NOT_FOUND"
    | "ITEM_CONFLICT"
    | "LOGISTIC_LOCATION_NOT_FOUND"
    | "LOGISTIC_LOCATION_CONFLICT"
    | "SHOPIFY_UPDATE_FAILED"
    | "UPDATE_FAILED";
  message: string;
};

export type ManagerAppPatchResult =
  | ManagerAppPatchSuccessResult
  | ManagerAppPatchFailureResult;

export type ManagerAppPatchItemsLocationResponse = {
  ok: boolean;
  updated: number;
  failed: number;
  results: ManagerAppPatchResult[];
};
