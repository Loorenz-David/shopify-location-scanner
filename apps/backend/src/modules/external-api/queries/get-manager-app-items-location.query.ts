import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  ManagerAppGetItemsLocationQuery,
  ManagerAppLocationItem,
} from "../contracts/external-api.contract.js";

type RawLocationRow = {
  itemBarcode: string | null;
  itemSku: string | null;
  latestLocation: string | null;
  logisticLocation: string | null;
  latestMatched: number;
};

export const getManagerAppItemsLocationQuery = async (
  input: ManagerAppGetItemsLocationQuery,
): Promise<ManagerAppLocationItem[]> => {
  const rows = await prisma.$queryRaw<RawLocationRow[]>(
    Prisma.sql`
      SELECT
        sh."itemBarcode" AS "itemBarcode",
        sh."itemSku" AS "itemSku",
        sh."latestLocation" AS "latestLocation",
        ll."location" AS "logisticLocation",
        CASE
          WHEN sh."latestLocation" IS NOT NULL
            AND LOWER(TRIM(sh."latestLocation")) = LOWER(TRIM(${input.q}))
          THEN 1
          ELSE 0
        END AS "latestMatched"
      FROM "ScanHistory" sh
      LEFT JOIN "LogisticLocation" ll ON ll."id" = sh."logisticLocationId"
      WHERE
        (
          sh."latestLocation" IS NOT NULL
          AND LOWER(TRIM(sh."latestLocation")) = LOWER(TRIM(${input.q}))
        )
        OR
        (
          ll."location" IS NOT NULL
          AND LOWER(TRIM(ll."location")) = LOWER(TRIM(${input.q}))
        )
      ORDER BY sh."updatedAt" DESC, sh."id" ASC
    `,
  );

  return rows.map((row) => {
    const item: ManagerAppLocationItem = {
      item_position:
        row.latestMatched === 1
          ? (row.latestLocation as string)
          : (row.logisticLocation as string),
    };

    if (input.item_identity.includes("article_number")) {
      item.item_article_number = row.itemBarcode;
    }

    if (input.item_identity.includes("sku")) {
      item.sku = row.itemSku;
    }

    return item;
  });
};
