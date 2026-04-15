import webpush from "web-push";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logging/logger.js";
import type { PushSubscriptionRecord } from "../repositories/push-subscription.repository.js";

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

export type PushPayload = {
  type: string;
  count: number;
  itemIds: string[];
  message: string;
};

export const sendPushNotification = async (
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<"sent" | "expired"> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );

    return "sent";
  } catch (err: any) {
    // HTTP 410 Gone = subscription has been revoked by the browser
    if (err.statusCode === 410) {
      logger.info("Push subscription expired (410), should be deleted", {
        userId: subscription.userId,
        endpoint: subscription.endpoint,
      });
      return "expired";
    }

    logger.error("Push notification failed", {
      userId: subscription.userId,
      error: err.message,
    });

    throw err;
  }
};
