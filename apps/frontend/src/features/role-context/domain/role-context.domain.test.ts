import { describe, expect, it } from "vitest";
import { buildRoleCapabilities } from "./role-context.domain";

describe("manager and admin task defaults", () => {
  it("opens the same pending placement queue as a worker and can filter placed fix tasks", () => {
    const manager = buildRoleCapabilities("manager");
    const admin = buildRoleCapabilities("admin");
    const worker = buildRoleCapabilities("worker");

    expect(manager.task_page_default_filters).toEqual(worker.task_page_default_filters);
    expect(admin.task_page_default_filters).toEqual(manager.task_page_default_filters);
    expect(manager.task_page_allowed_filters).toEqual(
      expect.arrayContaining(["lastLogisticEventType", "fixItem", "isItemFixed"]),
    );
    expect(admin.task_page_allowed_filters).toEqual(manager.task_page_allowed_filters);
    expect(manager.can_clear_logistic_tasks).toBe(true);
    expect(admin.can_clear_logistic_tasks).toBe(true);
    expect(worker.can_clear_logistic_tasks).toBe(false);
    expect(buildRoleCapabilities("seller").can_clear_logistic_tasks).toBe(false);
  });
});
