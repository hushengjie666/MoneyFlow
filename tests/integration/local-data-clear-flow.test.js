import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("local data clear flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("clears snapshot and all events via DELETE /api/local-data", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 8888 })
    });
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "临时收入",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 100,
        effectiveAt: new Date(Date.now() - 1000).toISOString()
      })
    });

    const clearRes = await fetch(`${baseUrl}/api/local-data`, { method: "DELETE" });
    expect(clearRes.status).toBe(200);

    const snapshot = await (await fetch(`${baseUrl}/api/snapshot`)).json();
    expect(snapshot.initialBalanceYuan).toBe(0);
    expect(snapshot.currentBalanceYuan).toBe(0);

    const events = await (await fetch(`${baseUrl}/api/events`)).json();
    expect(events).toEqual([]);
  });
});
