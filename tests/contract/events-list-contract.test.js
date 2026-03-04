import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "../integration/test-server.js";

const useServer = registerCleanup(createTestServer);

describe("events list contract", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("supports GET /api/events with optional status filter", async () => {
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "列表排序测试事件",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 200,
        effectiveAt: new Date().toISOString()
      })
    });

    const listRes = await fetch(`${baseUrl}/api/events`);
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);

    const activeRes = await fetch(`${baseUrl}/api/events?status=active`);
    expect(activeRes.status).toBe(200);
  });
});
