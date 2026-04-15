import { Redis } from "ioredis";
import { env } from "../../../config/env.js";
import { notificationQueue } from "../../../shared/queue/notification-queue.js";

const USER_ACTIVITY_TTL_SECONDS = 86_400; // 24 hours
export const NOTIFICATION_DELAYS_MS = {
  worker: 5 * 60 * 1_000,
  manager: 30 * 60 * 1_000,
} as const;

const activityClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

export const updateUserActivity = async (userId: string): Promise<void> => {
  await activityClient.set(
    `iss:user:activity:${userId}`,
    Date.now().toString(),
    "EX",
    USER_ACTIVITY_TTL_SECONDS,
  );
};

export const isUserIdle = async (
  userId: string,
  thresholdMs: number,
): Promise<boolean> => {
  const raw = await activityClient.get(`iss:user:activity:${userId}`);
  if (!raw) return true;
  return Date.now() - Number(raw) >= thresholdMs;
};

export const scheduleRoleNotification = async (
  shopId: string,
  role: "worker" | "manager",
): Promise<void> => {
  const delayMs = NOTIFICATION_DELAYS_MS[role];
  await notificationQueue.add(
    `notify-${role}`,
    { shopId, role },
    {
      delay: delayMs,
      jobId: `notify-${shopId}-${role}-${Math.floor(Date.now() / delayMs)}`,
    },
  );
};
