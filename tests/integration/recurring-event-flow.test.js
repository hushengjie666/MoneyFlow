import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("recurring event flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("creates recurring event and supports pause/delete/restore and hard delete", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 0 })
    });
    const createRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "日度周期入项",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 86400,
        effectiveAt: new Date(Date.now() - 10_000).toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1
      })
    });
    const created = await createRes.json();

    const tick1 = await (await fetch(`${baseUrl}/api/realtime-balance`)).json();
    expect(tick1.sourceSummary.activeRecurringCount).toBe(1);

    await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" })
    });
    const tick2 = await (await fetch(`${baseUrl}/api/realtime-balance`)).json();
    expect(tick2.sourceSummary.activeRecurringCount).toBe(0);

    const patchDeleteRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" })
    });
    expect(patchDeleteRes.status).toBe(200);

    const patchRestoreRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" })
    });
    expect(patchRestoreRes.status).toBe(200);

    const tick3 = await (await fetch(`${baseUrl}/api/realtime-balance`)).json();
    expect(tick3.sourceSummary.activeRecurringCount).toBe(1);
    expect(tick3.flowPerSecondYuan).toBeGreaterThan(0);

    const patchDirectionRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "outflow" })
    });
    expect(patchDirectionRes.status).toBe(200);
    const patched = await patchDirectionRes.json();
    expect(patched.direction).toBe("outflow");

    const tick4 = await (await fetch(`${baseUrl}/api/realtime-balance`)).json();
    expect(tick4.flowPerSecondYuan).toBeLessThan(0);

    const hardDeleteRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "DELETE"
    });
    expect(hardDeleteRes.status).toBe(200);

    const listAfterHardDelete = await (await fetch(`${baseUrl}/api/events`)).json();
    expect(listAfterHardDelete.some((event) => event.id === created.id)).toBe(false);
  });
});
