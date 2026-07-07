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
        ll."location" AS "logisticLocation"
      FROM "ScanHistory" sh
      LEFT JOIN "LogisticLocation" ll ON ll."id" = sh."logisticLocationId"
      WHERE
        ${input.item_identity.includes("sku")
          ? Prisma.sql`
              (
                sh."itemSku" IS NOT NULL
                AND LOWER(TRIM(sh."itemSku")) = LOWER(TRIM(${input.q}))
              )
            `
          : Prisma.sql`0 = 1`}
        OR
        ${input.item_identity.includes("article_number")
          ? Prisma.sql`
              (
                sh."itemBarcode" IS NOT NULL
                AND LOWER(TRIM(sh."itemBarcode")) = LOWER(TRIM(${input.q}))
              )
            `
          : Prisma.sql`0 = 1`}
      ORDER BY sh."updatedAt" DESC, sh."id" ASC
    `,
  );

  return rows.map((row) => {
    const item: ManagerAppLocationItem = {
      item_position: row.logisticLocation ?? row.latestLocation ?? "",
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
