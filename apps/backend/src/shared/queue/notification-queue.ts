import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

export type NotificationJobPayload = {
  shopId: string;
  role: "worker" | "manager";
};

export const notificationQueue = new Queue<NotificationJobPayload>(
  "logistic-notifications",
  {
    connection: redisConnection,
    prefix: "iss",
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  },
);
