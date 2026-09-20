import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  ManagerStockLedgerRecord,
  ManagerStockQuery,
} from "../contracts/outbound-webhook.contract.js";

const ORDER: Prisma.ManagerStockLedgerOrderByWithRelationInput[] = [
  { itemCategory: "asc" },
  { propertiesCanonical: "asc" },
];

export const managerStockLedgerRepository = {
  /** The identities Manager is believed to hold — the delete-derivation input (§12A.3). */
  async listActive(shopId: string): Promise<ManagerStockLedgerRecord[]> {
    return prisma.managerStockLedger.findMany({
      where: { shopId, state: "active" },
      orderBy: ORDER,
    }) as unknown as Promise<ManagerStockLedgerRecord[]>;
  },

  async list(input: { shopId: string } & ManagerStockQuery): Promise<ManagerStockLedgerRecord[]> {
    return prisma.managerStockLedger.findMany({
      where: {
        shopId: input.shopId,
        ...(input.state ? { state: input.state } : {}),
        ...(input.outcome ? { lastOutcome: input.outcome } : {}),
      },
      orderBy: ORDER,
    }) as unknown as Promise<ManagerStockLedgerRecord[]>;
  },

  /**
   * §12A.3, written **before** the demand request leaves: if Manager applies the
   * entry but Scanner never records the answer, the identity is still known and
   * can still be deleted once it vanishes.
   */
  async prewriteDemand(input: {
    shopId: string;
    itemCategory: string;
    propertiesCanonical: string;
    properties: Prisma.InputJsonValue;
    quantity: number;
    deliveryId: string;
    sentAt: Date;
  }): Promise<{ id: string }> {
    return prisma.managerStockLedger.upsert({
      where: {
        shopId_itemCategory_propertiesCanonical: {
          shopId: input.shopId,
          itemCategory: input.itemCategory,
          propertiesCanonical: input.propertiesCanonical,
        },
      },
      create: {
        shopId: input.shopId,
        itemCategory: input.itemCategory,
        propertiesCanonical: input.propertiesCanonical,
        properties: input.properties,
        state: "active",
        lastSentQuantity: input.quantity,
        lastSentAt: input.sentAt,
        lastDeliveryId: input.deliveryId,
      },
      update: {
        state: "active",
        properties: input.properties,
        lastSentQuantity: input.quantity,
        lastSentAt: input.sentAt,
        lastDeliveryId: input.deliveryId,
      },
      select: { id: true },
    });
  },

  /**
   * §12A.3: a demand answer never changes the state. `lastAppliedQuantity` is
   * written only from an `applied` outcome, never from a non-200.
   */
  async recordDemandOutcome(input: {
    id: string;
    outcome: string;
    appliedQuantity?: number;
  }): Promise<void> {
    await prisma.managerStockLedger.update({
      where: { id: input.id },
      data: {
        lastOutcome: input.outcome,
        ...(input.appliedQuantity === undefined
          ? {}
          : { lastAppliedQuantity: input.appliedQuantity }),
      },
    });
  },

  /**
   * §12A.3: `deleted`, `not_found` and `category_not_found` all end the identity
   * — Manager holds no live row for it either way. Any non-200, unparseable 200
   * or transport error leaves the row untouched, so the next sync re-derives the
   * delete (Card 5).
   */
  async recordDeleteOutcome(input: {
    id: string;
    outcome: string;
    deliveryId: string;
    sentAt: Date;
  }): Promise<void> {
    await prisma.managerStockLedger.update({
      where: { id: input.id },
      data: {
        state: "deleted",
        lastOutcome: input.outcome,
        lastDeliveryId: input.deliveryId,
        lastSentAt: input.sentAt,
      },
    });
  },
};
