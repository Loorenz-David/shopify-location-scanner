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
  errorCode: ManagerAppPatchFailureResult["errorCode"],
  message: string,
): ManagerAppPatchFailureResult => ({
  status: "failed",
  position,
  errorCode,
  message,
});

const success = (
  position: string,
  route: ManagerAppPatchSuccessResult["route"],
  scanHistoryId: string,
): ManagerAppPatchSuccessResult => ({
  status: "updated",
  position,
  route,
  scanHistoryId,
});

const resolveByField = async (
  field: "itemSku" | "itemBarcode",
  value: string,
): Promise<ResolvedScanHistory[]> => {
  return prisma.scanHistory.findMany({
    where: { [field]: value },
    select: {
      id: true,
      shopId: true,
      productId: true,
      itemSku: true,
      itemBarcode: true,
      isSold: true,
    },
    orderBy: { updatedAt: "desc" },
  });
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

const updateTarget = async (input: {
  position: string;
  username: string;
  target: ManagerAppItemTarget;
}): Promise<ManagerAppPatchResult> => {
  const resolved = await resolveTarget(input.target);

  if (resolved.status === "failed") {
    return failure(input.position, resolved.errorCode, resolved.message);
  }

  const { record } = resolved;

  if (!record.isSold) {
    try {
      const originalItemId =
        resolved.resolvedBy === "sku"
          ? (record.itemSku ?? input.target.sku ?? record.productId)
          : (record.itemBarcode ??
              input.target.article_number ??
              record.productId);

      await updateItemLocationCommand({
        shopId: record.shopId,
        userId: null,
        username: input.username,
        resolvedProductId: record.productId,
        originalItemId,
        idType: resolved.resolvedBy === "sku" ? "sku" : "barcode",
        payload: { location: input.position },
      });

      return success(input.position, "scanner", record.id);
    } catch (error) {
      logger.warn("External manager-app scanner update failed", {
        scanHistoryId: record.id,
        shopId: record.shopId,
        error: error instanceof Error ? error.message : "unknown",
      });

      return failure(
        input.position,
        "SHOPIFY_UPDATE_FAILED",
        "Unable to update unsold item location through Shopify",
      );
    }
  }

  const logisticLocation = await findLogisticLocation({
    shopId: record.shopId,
    position: input.position,
  });

  if (logisticLocation.status === "failed") {
    return failure(
      input.position,
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

    return success(input.position, "logistic", record.id);
  } catch (error) {
    logger.warn("External manager-app logistic placement failed", {
      scanHistoryId: record.id,
      shopId: record.shopId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return failure(
      input.position,
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
