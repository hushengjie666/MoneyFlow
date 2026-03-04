import { describe, expect, it } from "vitest";
import { computeBalanceTick } from "../../backend/src/services/balance-service.js";

describe("recurring proration", () => {
  it("prorates recurring amount per second", () => {
    const base = new Date("2026-01-01T00:01:00.000Z");
    const now = new Date(base.getTime() + 10_000);

    const tick = computeBalanceTick({
      initialBalanceYuan: 0,
      now,
      events: [
        {
          eventKind: "recurring",
          direction: "inflow",
          amountYuan: 86340,
          effectiveAt: base.toISOString(),
          recurrenceUnit: "day",
          recurrenceInterval: 1,
          dailyStartTime: "00:01",
          dailyEndTime: "24:00",
          status: "active"
        }
      ]
    });
    expect(tick.displayBalanceYuan).toBe(10);
  });

  it("only accrues in configured daily window", () => {
    const effective = new Date("2026-01-01T00:00:00.000Z");
    const beforeWindow = new Date("2026-01-01T07:59:59.000Z");
    const inWindow = new Date("2026-01-01T09:00:00.000Z");
    const afterWindow = new Date("2026-01-01T18:00:00.000Z");

    const event = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 90,
      effectiveAt: effective.toISOString(),
      recurrenceUnit: "day",
      recurrenceInterval: 1,
      dailyStartTime: "08:00",
      dailyEndTime: "17:00",
      status: "active"
    };

    const tickBefore = computeBalanceTick({ initialBalanceYuan: 0, now: beforeWindow, events: [event] });
    const tickIn = computeBalanceTick({ initialBalanceYuan: 0, now: inWindow, events: [event] });
    const tickAfter = computeBalanceTick({ initialBalanceYuan: 0, now: afterWindow, events: [event] });

    expect(tickBefore.displayBalanceYuan).toBe(0);
    expect(tickIn.displayBalanceYuan).toBeGreaterThan(0);
    expect(tickAfter.displayBalanceYuan).toBe(90);
  });
});
