import { z } from "zod";

const ScanHistoryStringFilterColumnSchema = z.enum([
  "username",
  "productId",
  "itemCategory",
  "itemSku",
  "itemBarcode",
  "itemType",
  "itemTitle",
  "eventUsername",
  "eventLocation",
]);

const FrontendScanHistoryFieldSchema = z.enum([
  "username",
  "sku",
  "barcode",
  "location",
  "itemTitle",
  "itemCategory",
]);

const ScanHistoryStatusFilterSchema = z.enum(["active", "sold"]);
const SalesChannelFilterSchema = z.enum([
  "webshop",
  "physical",
  "imported",
  "unknown",
]);

const OptionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const OptionalDateQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

const OptionalStringColumnsQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const columns = rawValues
    .flatMap((entry) =>
      typeof entry === "string" ? entry.split(",") : [String(entry)],
    )
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return columns.length > 0 ? columns : undefined;
}, z.array(ScanHistoryStringFilterColumnSchema).optional());

const mapFrontendFieldToColumn = (
  field: z.infer<typeof FrontendScanHistoryFieldSchema>,
): ScanHistoryStringFilterColumn => {
  switch (field) {
    case "username":
      return "username";
    case "sku":
      return "itemSku";
    case "barcode":
      return "itemBarcode";
    case "location":
      return "eventLocation";
    case "itemTitle":
      return "itemTitle";
    case "itemCategory":
      return "itemCategory";
  }
};

const OptionalFieldsQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const parsedFields = rawValues.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [String(entry)];
    }

    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmedEntry) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [trimmedEntry];
    } catch {
      return trimmedEntry.split(",");
    }
  });

  const fields = parsedFields
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return fields.length > 0 ? fields : undefined;
}, z.array(FrontendScanHistoryFieldSchema).optional());

export const AppendScanLocationHistorySchema = z.object({
  shopId: z.string().min(1),
  userId: z.string().min(1).nullable().optional(),
  username: z.string().trim().min(1).max(80),
  eventType: z
    .enum(["location_update", "unknown_position", "sold_terminal"])
    .optional(),
  currentPrice: z.string().trim().min(1).max(80).nullable().optional(),
  itemHeight: z.number().positive().nullable().optional(),
  itemWidth: z.number().positive().nullable().optional(),
  itemDepth: z.number().positive().nullable().optional(),
  volume: z.number().positive().nullable().optional(),
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).optional(),
  itemCategory: z.string().trim().min(1).max(120).nullable().optional(),
  itemSku: z.string().trim().min(1).max(120).nullable().optional(),
  itemBarcode: z.string().trim().min(1).max(120).nullable().optional(),
  itemImageUrl: z.string().url().nullable().optional(),
  itemType: z.string().trim().min(1).max(40),
  itemTitle: z.string().trim().min(1).max(255),
  location: z.string().trim().min(1).max(120),
  happenedAt: z.date().optional(),
});

export const GetScanHistoryItemParamsSchema = z.object({
  productId: z.string().trim().min(1),
});

export const GetScanHistoryItemQuerySchema = z.object({
  productId: z.string().trim().min(1),
});

export const GetScanHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    q: z.string().trim().min(1).max(120).optional(),
    fields: OptionalFieldsQuerySchema,
    status: ScanHistoryStatusFilterSchema.default("active"),
    includeLocationHistory: OptionalBooleanQuerySchema,
    stringColumns: OptionalStringColumnsQuerySchema,
    sold: OptionalBooleanQuerySchema,
    inStore: OptionalBooleanQuerySchema,
    salesChannel: SalesChannelFilterSchema.optional(),
    from: OptionalDateQuerySchema,
    to: OptionalDateQuerySchema,
    cursor: z.string().optional(), // format: "<lastModifiedAt ISO>|<id>"
  })
  .refine((input) => !(input.sold && input.inStore), {
    message: "sold and inStore filters are mutually exclusive",
    path: ["sold"],
  })
  .transform((input) => {
    const stringColumns =
      input.fields?.map(mapFrontendFieldToColumn) ?? input.stringColumns;

    let sold = input.sold;
    let inStore = input.inStore;

    if (input.status === "sold") {
      sold = true;
      inStore = false;
    } else if (input.status === "active") {
      sold = false;
      inStore = true;
    }

    return {
      page: input.page,
      q: input.q,
      fields: input.fields,
      status: input.status,
      includeLocationHistory: input.includeLocationHistory ?? false,
      stringColumns,
      sold,
      inStore,
      salesChannel: input.salesChannel,
      from: input.from,
      to: input.to,
      cursor: input.cursor,
    };
  });

export type ScanHistoryStringFilterColumn = z.infer<
  typeof ScanHistoryStringFilterColumnSchema
>;

export type AppendScanLocationHistoryInput = z.infer<
  typeof AppendScanLocationHistorySchema
>;
export type GetScanHistoryItemParamsInput = z.infer<
  typeof GetScanHistoryItemParamsSchema
>;
export type GetScanHistoryItemQueryInput = z.infer<
  typeof GetScanHistoryItemQuerySchema
>;
export type GetScanHistoryQueryInput = z.infer<
  typeof GetScanHistoryQuerySchema
>;
