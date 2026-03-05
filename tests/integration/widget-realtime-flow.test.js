import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("widget realtime flow", () => {
  let baseUrl;

  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("keeps realtime tick updates within 2 seconds", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 1000 })
    });

    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "组件实时入项",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 300,
        effectiveAt: new Date(Date.now() - 30_000).toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1
      })
    });

    const firstRes = await fetch(`${baseUrl}/api/realtime-balance`);
    const firstTick = await firstRes.json();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const secondRes = await fetch(`${baseUrl}/api/realtime-balance`);
    const secondTick = await secondRes.json();

    const deltaMs = Date.parse(secondTick.timestamp) - Date.parse(firstTick.timestamp);
    expect(deltaMs).toBeGreaterThanOrEqual(1000);
    expect(deltaMs).toBeLessThanOrEqual(2500);
    expect(Number(secondTick.displayBalanceYuan)).toBeGreaterThanOrEqual(Number(firstTick.displayBalanceYuan));
  });
});

