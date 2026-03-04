import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("one-time event flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("updates snapshot balance when one-time inflow/outflow are added", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 1000 })
    });
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "一次入项",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 300,
        effectiveAt: new Date(Date.now() - 1000).toISOString()
      })
    });
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "一次出项",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 100,
        effectiveAt: new Date(Date.now() - 1000).toISOString()
      })
    });

    const snapshotRes = await fetch(`${baseUrl}/api/snapshot`);
    const snapshot = await snapshotRes.json();
    expect(snapshot.currentBalanceYuan).toBe(1200);
  });
});
