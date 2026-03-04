import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "../integration/test-server.js";

const useServer = registerCleanup(createTestServer);

describe("events recurring contract", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("requires recurrence fields for recurring event", async () => {
    const badRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "missing recurring fields",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 500,
        effectiveAt: new Date().toISOString()
      })
    });
    expect(badRes.status).toBe(400);
  });

  it("supports daily time window fields for recurring event", async () => {
    const okRes = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "work hour inflow",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 500,
        effectiveAt: new Date().toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1,
        dailyStartTime: "08:00",
        dailyEndTime: "17:00"
      })
    });
    expect(okRes.status).toBe(201);
    const body = await okRes.json();
    expect(body.dailyStartTime).toBe("08:00");
    expect(body.dailyEndTime).toBe("17:00");
  });

  it("rejects invalid daily time window", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "invalid work time",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 500,
        effectiveAt: new Date().toISOString(),
        recurrenceUnit: "day",
        recurrenceInterval: 1,
        dailyStartTime: "18:00",
        dailyEndTime: "09:00"
      })
    });
    expect(res.status).toBe(400);
  });
});
