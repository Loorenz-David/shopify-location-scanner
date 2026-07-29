import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { markLogisticPlacementCommand } from "../../logistic/commands/mark-logistic-placement.command.js";
import { updateItemLocationCommand } from "../../shopify/commands/update-item-location.command.js";
import type {
  ManagerAppItemTarget,
  ManagerAppPatchFailureResult,
  ManagerAppPatchItemsLocationInput,
  ManagerAppPatchItemsLocationResponse,
  ManagerAppPatchResult,
  ManagerAppPatchSuccessResult,
  ManagerAppPatchTarget,
} from "../contracts/external-api.contract.js";

type ResolvedScanHistory = {
  id: string;
  shopId: string;
  productId: string;
  itemSku: string | null;
  itemBarcode: string | null;
  isSold: boolean;
};

type LogisticLocationMatch = {
  id: string;
};

const normalizeOptionalString = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const failure = (
  position: string,
  target: ManagerAppPatchTarget,
  errorCode: ManagerAppPatchFailureResult["errorCode"],
  message: string,
): ManagerAppPatchFailureResult => ({
  status: "failed",
  position,
  target,
  errorCode,
  message,
});

const success = (
  position: string,
  target: ManagerAppPatchTarget,
  route: ManagerAppPatchSuccessResult["route"],
  scanHistoryId: string,
): ManagerAppPatchSuccessResult => ({
  status: "updated",
  position,
  target,
  route,
  scanHistoryId,
});

const toPatchTarget = (target: ManagerAppItemTarget): ManagerAppPatchTarget => ({
  article_number: normalizeOptionalString(target.article_number),
  sku: normalizeOptionalString(target.sku),
});

const resolveByField = async (
  field: "itemSku" | "itemBarcode",
  value: string,
): Promise<ResolvedScanHistory[]> => {
  const column =
    field === "itemSku"
      ? Prisma.sql`sh."itemSku"`
      : Prisma.sql`sh."itemBarcode"`;

  return prisma.$queryRaw<ResolvedScanHistory[]>(
    Prisma.sql`
      SELECT
        sh."id" AS "id",
        sh."shopId" AS "shopId",
        sh."productId" AS "productId",
        sh."itemSku" AS "itemSku",
        sh."itemBarcode" AS "itemBarcode",
        sh."isSold" AS "isSold"
      FROM "ScanHistory" sh
      WHERE ${column} IS NOT NULL
        AND LOWER(TRIM(${column})) = LOWER(TRIM(${value}))
      ORDER BY sh."updatedAt" DESC
    `,
  );
};

const resolveTarget = async (
  target: ManagerAppItemTarget,
): Promise<
  | { status: "resolved"; record: ResolvedScanHistory; resolvedBy: "sku" | "barcode" }
  | { status: "failed"; errorCode: "ITEM_NOT_FOUND" | "ITEM_CONFLICT"; message: string }
> => {
  const sku = normalizeOptionalString(target.sku);
  const articleNumber = normalizeOptionalString(target.article_number);

  if (sku) {
    const skuMatches = await resolveByField("itemSku", sku);

    if (skuMatches.length === 1) {
      const record = skuMatches[0];
      if (record) {
        return { status: "resolved", record, resolvedBy: "sku" };
      }
    }

    if (skuMatches.length > 1) {
      return {
        status: "failed",
        errorCode: "ITEM_CONFLICT",
        message: `Multiple items matched sku "${sku}"`,
      };
    }
  }

  if (articleNumber) {
    const barcodeMatches = await resolveByField("itemBarcode", articleNumber);

    if (barcodeMatches.length === 1) {
      const record = barcodeMatches[0];
      if (record) {
        return { status: "resolved", record, resolvedBy: "barcode" };
      }
    }

    if (barcodeMatches.length > 1) {
      return {
        status: "failed",
        errorCode: "ITEM_CONFLICT",
        message: `Multiple items matched article_number "${articleNumber}"`,
      };
    }
  }

  return {
    status: "failed",
    errorCode: "ITEM_NOT_FOUND",
    message: "No item matched the provided target",
  };
};

const findLogisticLocation = async (input: {
  shopId: string;
  position: string;
}): Promise<
  | { status: "resolved"; logisticLocationId: string }
  | {
      status: "failed";
      errorCode: "LOGISTIC_LOCATION_NOT_FOUND" | "LOGISTIC_LOCATION_CONFLICT";
      message: string;
    }
> => {
  const matches = await prisma.$queryRaw<LogisticLocationMatch[]>(
    Prisma.sql`
      SELECT "id"
      FROM "LogisticLocation"
      WHERE "shopId" = ${input.shopId}
        AND LOWER(TRIM("location")) = LOWER(TRIM(${input.position}))
    `,
  );

  if (matches.length === 1) {
    const match = matches[0];
    if (match) {
      return { status: "resolved", logisticLocationId: match.id };
    }
  }

  if (matches.length > 1) {
    return {
      status: "failed",
      errorCode: "LOGISTIC_LOCATION_CONFLICT",
      message: `Multiple logistic locations matched position "${input.position}"`,
    };
  }

  return {
    status: "failed",
    errorCode: "LOGISTIC_LOCATION_NOT_FOUND",
    message: "Sold item requires a known logistic location",
  };
};

const updateViaShopify = async (input: {
  position: string;
  username: string;
  target: ManagerAppPatchTarget;
  rawTarget: ManagerAppItemTarget;
  record: ResolvedScanHistory;
  resolvedBy: "sku" | "barcode";
}): Promise<ManagerAppPatchResult> => {
  const { record } = input;

  try {
    const originalItemId =
      input.resolvedBy === "sku"
        ? (record.itemSku ?? input.rawTarget.sku ?? record.productId)
        : (record.itemBarcode ??
            input.rawTarget.article_number ??
            record.productId);

    await updateItemLocationCommand({
      shopId: record.shopId,
      userId: null,
      username: input.username,
      resolvedProductId: record.productId,
      originalItemId,
      idType: input.resolvedBy === "sku" ? "sku" : "barcode",
      payload: { location: input.position },
    });

    return success(input.position, input.target, "scanner", record.id);
  } catch (error) {
    logger.warn("External manager-app scanner update failed", {
      scanHistoryId: record.id,
      shopId: record.shopId,
      target: input.target,
      isSold: record.isSold,
      error: error instanceof Error ? error.message : "unknown",
    });

    return failure(
      input.position,
      input.target,
      "SHOPIFY_UPDATE_FAILED",
      "Unable to update item location through Shopify",
    );
  }
};

const updateTarget = async (input: {
  position: string;
  username: string;
  target: ManagerAppItemTarget;
}): Promise<ManagerAppPatchResult> => {
  const target = toPatchTarget(input.target);
  const resolved = await resolveTarget(input.target);

  if (resolved.status === "failed") {
    logger.warn("External manager-app item target could not be resolved", {
      position: input.position,
      target,
      errorCode: resolved.errorCode,
      message: resolved.message,
    });

    return failure(
      input.position,
      target,
      resolved.errorCode,
      resolved.message,
    );
  }

  const { record } = resolved;

  if (!record.isSold) {
    return updateViaShopify({
      position: input.position,
      username: input.username,
      target,
      rawTarget: input.target,
      record,
      resolvedBy: resolved.resolvedBy,
    });
  }

  const logisticLocation = await findLogisticLocation({
    shopId: record.shopId,
    position: input.position,
  });

  if (logisticLocation.status === "failed") {
    // Sold items may move to shop locations too: when the position is not a
    // logistic location, fall back to the shop route (the item stays sold).
    // A conflict among logistic locations is still a hard failure.
    if (logisticLocation.errorCode === "LOGISTIC_LOCATION_NOT_FOUND") {
      logger.info(
        "External manager-app sold item falling back to shop location update",
        {
          scanHistoryId: record.id,
          shopId: record.shopId,
          position: input.position,
        },
      );

      return updateViaShopify({
        position: input.position,
        username: input.username,
        target,
        rawTarget: input.target,
        record,
        resolvedBy: resolved.resolvedBy,
      });
    }

    logger.warn("External manager-app logistic location could not be resolved", {
      scanHistoryId: record.id,
      shopId: record.shopId,
      position: input.position,
      target,
      errorCode: logisticLocation.errorCode,
      message: logisticLocation.message,
    });

    return failure(
      input.position,
      target,
      logisticLocation.errorCode,
      logisticLocation.message,
    );
  }

  try {
    await markLogisticPlacementCommand({
      shopId: record.shopId,
      username: input.username,
      callerRole: "manager",
      payload: {
        scanHistoryId: record.id,
        logisticLocationId: logisticLocation.logisticLocationId,
      },
    });

    return success(input.position, target, "logistic", record.id);
  } catch (error) {
    logger.warn("External manager-app logistic placement failed", {
      scanHistoryId: record.id,
      shopId: record.shopId,
      target,
      error: error instanceof Error ? error.message : "unknown",
    });

    return failure(
      input.position,
      target,
      "UPDATE_FAILED",
      "Unable to update sold item logistic location",
    );
  }
};

export const updateManagerAppItemsLocationCommand = async (
  input: ManagerAppPatchItemsLocationInput,
): Promise<ManagerAppPatchItemsLocationResponse> => {
  const results: ManagerAppPatchResult[] = [];

  for (const group of input) {
    const username = normalizeOptionalString(group.username) ?? "external-api";

    for (const target of group.item_targets) {
      results.push(
        await updateTarget({
          position: group.position,
          username,
          target,
        }),
      );
    }
  }

  const updated = results.filter((result) => result.status === "updated").length;
  const failed = results.length - updated;
  const failureCodes = results
    .filter((result): result is ManagerAppPatchFailureResult => result.status === "failed")
    .map((result) => result.errorCode);

  logger.info("External manager-app item location update completed", {
    groups: input.length,
    targets: results.length,
    updated,
    failed,
    failureCodes,
  });

  return {
    ok: failed === 0,
    updated,
    failed,
    results,
  };
};
