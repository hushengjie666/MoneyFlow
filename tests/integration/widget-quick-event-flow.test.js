import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("widget quick event flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("creates quick one-time event and keeps snapshot consistent", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 1000 })
    });

    const createRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "小组件快速记账",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 100,
        effectiveAt: new Date(Date.now() - 1000).toISOString(),
        clientSource: "widget"
      })
    });
    expect(createRes.status).toBe(201);

    const snapshotRes = await fetch(`${baseUrl}/api/snapshot`);
    const snapshot = await snapshotRes.json();
    expect(snapshot.currentBalanceYuan).toBe(900);

    const eventsRes = await fetch(`${baseUrl}/api/events`);
    const events = await eventsRes.json();
    expect(events[0].title).toContain("小组件");
  });
});

