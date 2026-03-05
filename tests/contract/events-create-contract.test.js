import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "../integration/test-server.js";

const useServer = registerCleanup(createTestServer);

describe("events create contract", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("creates one_time event with 201 response", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "合同测试事件",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 500,
        effectiveAt: new Date().toISOString()
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("合同测试事件");
    expect(body.eventKind).toBe("one_time");
    expect(body.amountYuan).toBe(500);
  });

  it("allows empty title and falls back to default name", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 88,
        effectiveAt: new Date().toISOString()
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("未命名事件");
  });

  it("accepts widget one_time payload and rejects widget recurring payload", async () => {
    const okRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 12.5,
        effectiveAt: new Date().toISOString(),
        clientSource: "widget"
      })
    });
    expect(okRes.status).toBe(201);

    const badRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKind: "recurring",
        direction: "outflow",
        amountYuan: 12.5,
        effectiveAt: new Date().toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1,
        clientSource: "widget"
      })
    });
    expect(badRes.status).toBe(400);
    const body = await badRes.json();
    expect(body.error?.message).toContain("widget clientSource only supports one_time events");
  });
});
