import type { WebhookIntakeRecord } from "@prisma/client";
import { AppError } from "../../../shared/errors/app-error.js";
import { processOrdersCreateWebhookJob } from "./process-orders-create-webhook.job.js";
import { processOrdersPaidWebhookJob } from "./process-orders-paid-webhook.job.js";
import { processProductsUpdateWebhookJob } from "./process-products-update-webhook.job.js";

export const processShopifyWebhookIntakeJob = async (
  intake: WebhookIntakeRecord,
  dependencies: {
    broadcast: (
      shopId: string,
      event: { type: string } & Record<string, unknown>,
    ) => Promise<void> | void;
  },
): Promise<void> => {
  switch (intake.topic) {
    case "orders/create":
      await processOrdersCreateWebhookJob(intake);
      return;
    case "orders/paid":
      await processOrdersPaidWebhookJob(intake);
      return;
    case "products/update":
      await processProductsUpdateWebhookJob(intake, dependencies.broadcast);
      return;
    default:
      throw new AppError("Unsupported webhook topic", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: {
          topic: intake.topic,
        },
      });
  }
};
