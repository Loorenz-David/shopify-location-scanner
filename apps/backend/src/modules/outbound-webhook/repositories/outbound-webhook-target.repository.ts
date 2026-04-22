import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  OutboundEventType,
  OutboundWebhookTargetDto,
  RegisterOutboundTargetInput,
} from "../contracts/outbound-webhook.contract.js";

const LIST_SELECT = {
  id: true,
  label: true,
  targetUrl: true,
  eventType: true,
  active: true,
  createdAt: true,
} as const;

const toDto = (record: {
  id: string;
  label: string;
  targetUrl: string;
  eventType: string;
  active: boolean;
  createdAt: Date;
}): OutboundWebhookTargetDto => ({
  id: record.id,
  label: record.label,
  targetUrl: record.targetUrl,
  eventType: record.eventType as OutboundEventType,
  active: record.active,
  createdAt: record.createdAt,
});

export const outboundWebhookTargetRepository = {
  async findActiveByShopAndEvent(input: {
    shopId: string;
    eventType: OutboundEventType;
  }): Promise<Array<{ id: string; targetUrl: string; secret: string }>> {
    return prisma.outboundWebhookTarget.findMany({
      where: {
        shopId: input.shopId,
        eventType: input.eventType as any,
        active: true,
      },
      select: {
        id: true,
        targetUrl: true,
        secret: true,
      },
    });
  },

  async findByShopUrlAndEvent(input: {
    shopId: string;
    targetUrl: string;
    eventType: OutboundEventType;
  }): Promise<{ id: string; active: boolean } | null> {
    return prisma.outboundWebhookTarget.findUnique({
      where: {
        shopId_targetUrl_eventType: {
          shopId: input.shopId,
          targetUrl: input.targetUrl,
          eventType: input.eventType as any,
        },
      },
      select: {
        id: true,
        active: true,
      },
    });
  },

  async upsert(input: {
    shopId: string;
    payload: RegisterOutboundTargetInput;
  }): Promise<{ id: string }> {
    const target = await prisma.outboundWebhookTarget.upsert({
      where: {
        shopId_targetUrl_eventType: {
          shopId: input.shopId,
          targetUrl: input.payload.targetUrl,
          eventType: input.payload.eventType as any,
        },
      },
      create: {
        shopId: input.shopId,
        label: input.payload.label,
        targetUrl: input.payload.targetUrl,
        secret: input.payload.secret,
        eventType: input.payload.eventType as any,
        active: true,
      },
      update: {
        label: input.payload.label,
        secret: input.payload.secret,
        active: true,
      },
      select: {
        id: true,
      },
    });

    return { id: target.id };
  },

  async listByShop(shopId: string): Promise<OutboundWebhookTargetDto[]> {
    const records = await prisma.outboundWebhookTarget.findMany({
      where: { shopId },
      select: LIST_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return records.map(toDto);
  },

  async setActive(input: {
    id: string;
    shopId: string;
    active: boolean;
  }): Promise<boolean> {
    const result = await prisma.outboundWebhookTarget.updateMany({
      where: {
        id: input.id,
        shopId: input.shopId,
      },
      data: {
        active: input.active,
      },
    });

    return result.count > 0;
  },

  async remove(input: { id: string; shopId: string }): Promise<boolean> {
    const result = await prisma.outboundWebhookTarget.deleteMany({
      where: {
        id: input.id,
        shopId: input.shopId,
      },
    });

    return result.count > 0;
  },
};
