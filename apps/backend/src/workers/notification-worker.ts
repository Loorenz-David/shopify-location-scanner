import "../config/load-env.js";
import { Worker } from "bullmq";
import { prisma } from "../shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../shared/database/sqlite-runtime.js";
import { logger } from "../shared/logging/logger.js";
import { redisConnection } from "../shared/queue/redis-connection.js";
import {
  isUserIdle,
  NOTIFICATION_DELAYS_MS,
} from "../modules/logistic/services/logistic-notification.service.js";
import { createWsBroadcastPublisher } from "../shared/queue/ws-bridge.js";
import type { NotificationJobPayload } from "../shared/queue/notification-queue.js";
import { isUserConnectedViaWs } from "../modules/ws/ws-registry.js";
import {
  sendPushNotification,
  type PushPayload,
} from "../modules/logistic/services/push-notification.service.js";
import { pushSubscriptionRepository } from "../modules/logistic/repositories/push-subscription.repository.js";

await initializeDatabaseRuntime();

const wsBroadcastPublisher = createWsBroadcastPublisher();

const IDLE_THRESHOLDS_MS = {
  worker: NOTIFICATION_DELAYS_MS.worker,
  manager: NOTIFICATION_DELAYS_MS.manager,
} as const;

const PENDING_ITEM_FILTERS = {
  worker: {
    intention: { not: null, notIn: ["customer_took_it"] as const },
    logisticsCompletedAt: null,
    lastLogisticEventType: "marked_intention",
  },
  manager: {
    fixItem: true,
    logisticsCompletedAt: null,
    lastLogisticEventType: "placed",
  },
} as const;

const NOTIFICATION_MESSAGES = {
  worker: (count: number) =>
    `${count} item${count > 1 ? "s" : ""} are waiting to be picked up from store`,
  manager: (count: number) =>
    `${count} item${count > 1 ? "s" : ""} have been placed in the fixing area`,
} as const;

const notificationWorker = new Worker<NotificationJobPayload>(
  "logistic-notifications",
  async (job) => {
    const { shopId, role } = job.data;
    logger.info("Notification job started", { shopId, role, jobId: job.id });

    // Find all users of the target role for this shop
    const users = await prisma.user.findMany({
      where: { shopId, role: role as any },
      select: { id: true },
    });

    if (users.length === 0) {
      logger.info("No users found for role notification", { shopId, role });
      return;
    }

    const idleThresholdMs = IDLE_THRESHOLDS_MS[role];

    // Check which users are idle
    const idleChecks = await Promise.all(
      users.map((user) => isUserIdle(user.id, idleThresholdMs)),
    );

    const hasIdleUsers = idleChecks.some(Boolean);
    if (!hasIdleUsers) {
      logger.info("All users active, skipping notification", { shopId, role });
      return;
    }

    // Count pending items for this role
    const pendingItems = await prisma.scanHistory.findMany({
      where: {
        shopId,
        isSold: true,
        ...PENDING_ITEM_FILTERS[role],
      } as any,
      select: { id: true },
    });

    if (pendingItems.length === 0) {
      logger.info("No pending items, skipping notification", { shopId, role });
      return;
    }

    const count = pendingItems.length;
    const itemIds = pendingItems.map((item) => item.id);
    const message = NOTIFICATION_MESSAGES[role](count);

    const payload: PushPayload = {
      type: "logistic_batch_notification",
      count,
      itemIds,
      message,
    };

    // Separate idle users into WS-connected vs push-eligible
    const wsUserIds: string[] = [];
    const pushUsers: Array<{ id: string }> = [];

    for (let i = 0; i < users.length; i++) {
      const idleCheck = idleChecks[i];
      const user = users[i];
      if (!idleCheck || !user) continue;

      const isConnected = await isUserConnectedViaWs(shopId, user.id);
      if (isConnected) {
        wsUserIds.push(user.id);
      } else {
        pushUsers.push(user);
      }
    }

    // WS delivery (existing channel)
    if (wsUserIds.length > 0) {
      await wsBroadcastPublisher.publish(shopId, payload, [role]);
      logger.info("WS notification dispatched", {
        shopId,
        role,
        count,
        wsUserCount: wsUserIds.length,
      });
    }

    // Push delivery (new channel)
    for (const user of pushUsers) {
      const subscriptions = await pushSubscriptionRepository.findByUser({
        userId: user.id,
      });

      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, payload);

        if (result === "expired") {
          await pushSubscriptionRepository.deleteByEndpoint({
            userId: user.id,
            endpoint: sub.endpoint,
          });
        }
      }
    }

    if (pushUsers.length > 0) {
      logger.info("Push notification dispatched", {
        shopId,
        role,
        count,
        pushUserCount: pushUsers.length,
      });
    }
  },
  {
    connection: redisConnection,
    prefix: "iss",
    concurrency: 5,
  },
);

notificationWorker.on("completed", (job) => {
  logger.info("Notification job completed", { jobId: job.id });
});

notificationWorker.on("failed", (job, err) => {
  logger.error("Notification job failed", {
    jobId: job?.id,
    error: err.message,
  });
});

logger.info("Notification worker started");
