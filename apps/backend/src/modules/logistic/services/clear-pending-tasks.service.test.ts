import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The service imports the authenticated websocket broadcaster, which reads env at import time.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-at-least-thirty-two-characters";
process.env.SHOPIFY_API_KEY = "test";
process.env.SHOPIFY_API_SECRET = "test";
process.env.SHOPIFY_SCOPES = "read_products";
process.env.SHOPIFY_APP_URL = "https://example.test";
process.env.EXTERNAL_API_KEY = "test-external-key-at-least-thirty-two-characters";
process.env.VAPID_PUBLIC_KEY = "test";
process.env.VAPID_PRIVATE_KEY = "test";
process.env.VAPID_SUBJECT = "mailto:test@example.test";

test("clears only previewed pending tasks and restores by item or batch", async () => {
  const testDir = mkdtempSync(join(tmpdir(), "logistic-clear-test."));
  process.env.DATABASE_URL = `file:${join(testDir, "test.db")}`;
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("../../../..", import.meta.url)),
    env: process.env,
    stdio: "pipe",
  });
  const { prisma } = await import("../../../shared/database/prisma-client.js");
  const {
    clearPendingTasks,
    getTaskClearBatchItems,
    listTaskClearBatches,
    previewPendingTaskClear,
    restoreClearedTasks,
  } = await import("./clear-pending-tasks.service.js");
  const { getLogisticItemsQuery } = await import("../queries/get-logistic-items.query.js");
  const { logisticEventRepository } = await import("../repositories/logistic-event.repository.js");

  try {
    await prisma.shop.createMany({ data: [
      { id: "clear-shop", shopDomain: "clear-shop.test" },
      { id: "other-shop", shopDomain: "other-shop.test" },
    ] });
    const createItem = async (id: string, shopId: string, overrides: Record<string, unknown> = {}) =>
      prisma.scanHistory.create({ data: {
        id, shopId, username: "seller", productId: id, itemType: "sku", itemTitle: id,
        isSold: true, intention: "store_pickup", lastLogisticEventType: "marked_intention",
        ...overrides,
      } });
    await createItem("pending-1", "clear-shop");
    await createItem("pending-2", "clear-shop", { intention: "local_delivery" });
    await createItem("already-placed", "clear-shop", { lastLogisticEventType: "placed", fixItem: true });
    await createItem("no-intention", "clear-shop", { intention: null, lastLogisticEventType: null });
    await createItem("unsold", "clear-shop", { isSold: false });
    await createItem("completed", "clear-shop", { logisticsCompletedAt: new Date(), lastLogisticEventType: "fulfilled" });
    await createItem("other-pending", "other-shop");

    const preview = await previewPendingTaskClear("clear-shop");
    assert.equal(preview.count, 2);
    assert.deepEqual(preview.byIntention, { local_delivery: 1, store_pickup: 1 });

    await new Promise((resolve) => setTimeout(resolve, 5));
    await createItem("arrived-later", "clear-shop");
    const result = await clearPendingTasks({
      shopId: "clear-shop", actorUserId: "manager-1", actorName: "Manager",
      asOf: new Date(preview.asOf), expectedCount: preview.count, note: "Starting fresh",
    });
    assert.equal(result.clearedCount, 2);
    assert.ok(result.batchId);
    assert.equal((await prisma.scanHistory.findUniqueOrThrow({ where: { id: "arrived-later" } })).lastLogisticEventType, "marked_intention");
    assert.equal((await prisma.scanHistory.findUniqueOrThrow({ where: { id: "pending-1" } })).logisticsCompletedAt, null);
    assert.equal((await getLogisticItemsQuery({ shopId: "clear-shop", filters: { lastLogisticEventType: "marked_intention" } })).orders.flatMap((order) => order.items).length, 1);
    assert.equal((await getLogisticItemsQuery({ shopId: "clear-shop", filters: { lastLogisticEventType: "dismissed" } })).orders.flatMap((order) => order.items).length, 2);
    assert.equal((await getLogisticItemsQuery({ shopId: "clear-shop", filters: { noIntention: true } })).orders.flatMap((order) => order.items).length, 1);
    assert.equal((await getLogisticItemsQuery({ shopId: "clear-shop", filters: {} })).orders.flatMap((order) => order.items).length, 2);
    assert.equal((await listTaskClearBatches("clear-shop")).batches[0]?.remainingCount, 2);
    const recordedBatch = await prisma.logisticTaskClearBatch.findUniqueOrThrow({ where: { id: result.batchId } });
    assert.equal(recordedBatch.actorUserId, "manager-1");
    assert.equal(recordedBatch.note, "Starting fresh");
    assert.equal((await getTaskClearBatchItems("clear-shop", result.batchId)).items.length, 2);
    assert.equal((await listTaskClearBatches("other-shop")).batches.length, 0);
    await assert.rejects(getTaskClearBatchItems("other-shop", result.batchId), /not found for this shop/);
    await assert.rejects(
      clearPendingTasks({ shopId: "clear-shop", actorUserId: "manager-1", actorName: "Manager", asOf: new Date(preview.asOf), expectedCount: preview.count }),
      /Pending tasks changed/,
    );
    assert.equal(await prisma.scanHistoryLogistic.count({ where: { clearBatchId: result.batchId, eventType: { in: ["placed", "fulfilled"] } } }), 0);

    const one = await restoreClearedTasks({ shopId: "clear-shop", batchId: result.batchId, scanHistoryId: "pending-1", username: "Manager" });
    assert.equal(one.restoredCount, 1);
    const again = await restoreClearedTasks({ shopId: "clear-shop", batchId: result.batchId, scanHistoryId: "pending-1", username: "Manager" });
    assert.equal(again.restoredCount, 0);
    const rest = await restoreClearedTasks({ shopId: "clear-shop", batchId: result.batchId, username: "Manager" });
    assert.equal(rest.restoredCount, 1);
    assert.equal((await listTaskClearBatches("clear-shop")).batches[0]?.remainingCount, 0);
    assert.equal(await prisma.scanHistoryLogistic.count({ where: { clearBatchId: result.batchId, eventType: "dismissed" } }), 2);
    assert.equal(await prisma.scanHistoryLogistic.count({ where: { clearBatchId: result.batchId, eventType: "marked_intention" } }), 2);

    const stale = await previewPendingTaskClear("clear-shop");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await prisma.scanHistory.update({ where: { id: "pending-1" }, data: { lastLogisticEventType: "placed" } });
    await assert.rejects(
      clearPendingTasks({ shopId: "clear-shop", actorUserId: "manager-1", actorName: "Manager", asOf: new Date(stale.asOf), expectedCount: stale.count }),
      /Pending tasks changed/,
    );

    const nextPreview = await previewPendingTaskClear("clear-shop");
    const next = await clearPendingTasks({
      shopId: "clear-shop", actorUserId: "manager-1", actorName: "Manager",
      asOf: new Date(nextPreview.asOf), expectedCount: nextPreview.count,
    });
    assert.ok(next.batchId);
    await logisticEventRepository.appendEvent({
      scanHistoryId: "pending-2", shopId: "clear-shop", orderId: null,
      logisticLocationId: null, username: "Worker", eventType: "placed",
    });
    const partial = await restoreClearedTasks({ shopId: "clear-shop", batchId: next.batchId, username: "Manager" });
    assert.equal(partial.restoredCount, next.clearedCount - 1);
    assert.equal(partial.skippedCount, 1);
    assert.equal((await prisma.scanHistory.findUniqueOrThrow({ where: { id: "pending-2" } })).lastLogisticEventType, "placed");

    await prisma.scanHistory.createMany({
      data: Array.from({ length: 205 }, (_, index) => ({
        id: `bulk-${index}`, shopId: "other-shop", username: "seller",
        productId: `bulk-${index}`, itemType: "sku", itemTitle: `Bulk ${index}`,
        isSold: true, intention: "store_pickup" as const,
        lastLogisticEventType: "marked_intention" as const,
      })),
    });
    const bulkPreview = await previewPendingTaskClear("other-shop");
    assert.equal(bulkPreview.count, 206);
    const bulk = await clearPendingTasks({
      shopId: "other-shop", actorUserId: "manager-2", actorName: "Other manager",
      asOf: new Date(bulkPreview.asOf), expectedCount: bulkPreview.count,
    });
    assert.equal(bulk.clearedCount, 206);
    assert.ok(bulk.batchId);
    const firstPage = await getTaskClearBatchItems("other-shop", bulk.batchId);
    assert.equal(firstPage.items.length, 20);
    assert.ok(firstPage.nextCursor);
    assert.equal((await getTaskClearBatchItems("other-shop", bulk.batchId, firstPage.nextCursor)).items.length, 20);
    assert.equal(await prisma.scanHistoryLogistic.count({ where: { clearBatchId: bulk.batchId, eventType: "dismissed" } }), 206);
    assert.equal((await restoreClearedTasks({ shopId: "other-shop", batchId: bulk.batchId, username: "Other manager" })).restoredCount, 206);
    assert.equal((await listTaskClearBatches("other-shop")).batches[0]?.remainingCount, 0);
  } finally {
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  }
});
