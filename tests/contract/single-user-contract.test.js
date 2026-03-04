import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "../integration/test-server.js";

const useServer = registerCleanup(createTestServer);

describe("single-user contract", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("rejects userId/accountId fields in write payloads", async () => {
    const eventRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "x",
        title: "非法用户字段",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 500,
        effectiveAt: new Date().toISOString()
      })
    });
    expect(eventRes.status).toBe(400);

    const snapshotRes = await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: "abc",
        initialBalanceYuan: 1
      })
    });
    expect(snapshotRes.status).toBe(400);
  });
});
