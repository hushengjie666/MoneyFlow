import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("snapshot flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("persists initial balance and returns same value after reload", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 10000 })
    });

    const res = await fetch(`${baseUrl}/api/snapshot`);
    const body = await res.json();
    expect(body.initialBalanceYuan).toBe(10000);
  });

  it("reinitializes snapshot and keeps existing events", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 100 })
    });

    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "初始化前一次性事件",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 20,
        effectiveAt: new Date(Date.now() - 1000).toISOString()
      })
    });

    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "初始化前周期事件",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 100,
        effectiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1
      })
    });

    const resetRes = await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 300 })
    });
    const resetSnapshot = await resetRes.json();
    expect(resetSnapshot.currentBalanceYuan).toBe(300);

    const events = await (await fetch(`${baseUrl}/api/events`)).json();
    expect(events).toHaveLength(3);
    expect(events.some((event) => event.eventKind === "one_time")).toBe(true);
    expect(events.some((event) => event.eventKind === "recurring")).toBe(true);
    expect(events.some((event) => event.title === "初始化对齐")).toBe(true);
  });
});
