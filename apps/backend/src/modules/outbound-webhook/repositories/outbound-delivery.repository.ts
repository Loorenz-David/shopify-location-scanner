import { prisma } from "../../../shared/database/prisma-client.js";
import type { OutboundEventType } from "../contracts/outbound-webhook.contract.js";

export const outboundDeliveryRepository = {
  create: (data: { shopId: string; targetId?: string | null; eventType: OutboundEventType; subjectKey?: string | null; status: "pending" | "delivered" | "rejected" | "failed" | "skipped"; requestBody: string; lastError?: string | null }) => prisma.outboundWebhookDelivery.create({ data: { ...data, eventType: data.eventType as any, status: data.status as any } }),
  update: (id: string, data: Record<string, unknown>) => prisma.outboundWebhookDelivery.update({ where: { id }, data: data as any }),
  find: (id: string) => prisma.outboundWebhookDelivery.findUnique({ where: { id } }),
  list: (shopId: string, where: Record<string, unknown>, take: number) => prisma.outboundWebhookDelivery.findMany({ where: { shopId, ...where } as any, orderBy: { createdAt: "desc" }, take }),
  redrive: () => prisma.outboundWebhookDelivery.findMany({ where: { eventType: "items_processed", OR: [{ status: "pending", createdAt: { lt: new Date(Date.now() - 300000) } }, { status: "failed", createdAt: { gte: new Date(Date.now() - 604800000) } }, { status: "rejected", responseStatus: 401, createdAt: { gte: new Date(Date.now() - 604800000) } }] } as any, orderBy: { createdAt: "asc" }, take: 200 }),
  prune: (before: Date) => prisma.outboundWebhookDelivery.deleteMany({ where: { createdAt: { lt: before } } }),
};
