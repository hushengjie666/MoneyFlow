import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("recurring balance continuity", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("keeps historical accrued balance when recurring event is edited or deleted", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 0 })
    });

    const effectiveAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "月度收入",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 9000,
        effectiveAt,
        recurrenceUnit: "month",
        recurrenceInterval: 1,
        dailyStartTime: "00:01",
        dailyEndTime: "23:59",
        activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
      })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const beforeEdit = await (await fetch(`${baseUrl}/api/snapshot`)).json();

    const editRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountYuan: 12000
      })
    });
    expect(editRes.status).toBe(200);

    const afterEdit = await (await fetch(`${baseUrl}/api/snapshot`)).json();
    const editJump = Math.abs(Number(afterEdit.currentBalanceYuan) - Number(beforeEdit.currentBalanceYuan));
    expect(editJump).toBeLessThan(1);

    const deleteRes = await fetch(`${baseUrl}/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" })
    });
    expect(deleteRes.status).toBe(200);

    const afterDelete = await (await fetch(`${baseUrl}/api/snapshot`)).json();
    const deleteJump = Math.abs(Number(afterDelete.currentBalanceYuan) - Number(afterEdit.currentBalanceYuan));
    expect(deleteJump).toBeLessThan(1);

    const tick = await (await fetch(`${baseUrl}/api/realtime-balance`)).json();
    expect(tick.flowPerSecondYuan).toBe(0);
  });
});
