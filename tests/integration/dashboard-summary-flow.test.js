import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("dashboard summary flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("returns latest snapshot and recent events", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 500 })
    });
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "较早创建",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 300,
        effectiveAt: new Date(Date.now() - 1000).toISOString()
      })
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "较晚创建",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 50,
        effectiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const snapshot = await (await fetch(`${baseUrl}/api/snapshot`)).json();
    const events = await (await fetch(`${baseUrl}/api/events`)).json();
    expect(snapshot.currentBalanceYuan).toBe(750);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].title).toBe("较晚创建");
  });
});
