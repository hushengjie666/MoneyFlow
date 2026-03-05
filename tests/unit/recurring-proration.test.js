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
    const beforeWindow = new Date("2025-12-31T23:59:59.000Z");
    const inWindow = new Date("2026-01-01T01:00:00.000Z");
    const afterWindow = new Date("2026-01-01T10:00:00.000Z");

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

  it("respects Asia/Shanghai daily window boundaries", () => {
    const event = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 3600,
      effectiveAt: "2025-12-31T16:00:00.000Z",
      recurrenceUnit: "day",
      recurrenceInterval: 1,
      dailyStartTime: "08:00",
      dailyEndTime: "09:00",
      status: "active"
    };

    const beforeLocalStart = new Date("2025-12-31T23:59:59.000Z");
    const afterLocalStart = new Date("2026-01-01T00:00:01.000Z");

    const tickBefore = computeBalanceTick({ initialBalanceYuan: 0, now: beforeLocalStart, events: [event] });
    const tickAfter = computeBalanceTick({ initialBalanceYuan: 0, now: afterLocalStart, events: [event] });

    expect(tickBefore.sourceSummary.activeRecurringCount).toBe(0);
    expect(tickAfter.sourceSummary.activeRecurringCount).toBe(1);
    expect(tickAfter.flowPerSecondYuan).toBeGreaterThan(0);
  });

  it("does not accrue on unselected weekdays", () => {
    const event = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 3600,
      effectiveAt: "2026-01-05T00:00:00.000Z",
      recurrenceUnit: "day",
      recurrenceInterval: 1,
      dailyStartTime: "08:00",
      dailyEndTime: "09:00",
      activeWeekdays: [1, 2, 3, 4, 5],
      status: "active"
    };

    const saturdayDuringWindow = new Date("2026-01-10T00:30:00.000Z");
    const mondayDuringWindow = new Date("2026-01-12T00:30:00.000Z");

    const tickSaturday = computeBalanceTick({ initialBalanceYuan: 0, now: saturdayDuringWindow, events: [event] });
    const tickMonday = computeBalanceTick({ initialBalanceYuan: 0, now: mondayDuringWindow, events: [event] });

    expect(tickSaturday.flowPerSecondYuan).toBe(0);
    expect(tickMonday.flowPerSecondYuan).toBeGreaterThan(0);
  });

  it("scales per-second flow by active weekday density for monthly recurring event", () => {
    const event = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 10000,
      effectiveAt: "2026-01-06T00:00:00.000Z",
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59",
      activeWeekdays: [1],
      status: "active"
    };

    const mondayMidday = new Date("2026-01-12T04:00:00.000Z");
    const tick = computeBalanceTick({ initialBalanceYuan: 0, now: mondayMidday, events: [event] });
    const expectedFlow = 10000 / (4 * (23 * 3600 + 58 * 60));

    expect(tick.flowPerSecondYuan).toBeCloseTo(expectedFlow, 10);
  });

  it("preserves monthly flow precision for 20000 salary display", () => {
    const event = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 20000,
      effectiveAt: "2026-01-01T00:00:00.000Z",
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:00",
      dailyEndTime: "24:00",
      activeWeekdays: [1, 2, 3, 4, 5, 6, 7],
      status: "active"
    };

    const now = new Date("2026-01-15T12:00:00.000Z");
    const tick = computeBalanceTick({ initialBalanceYuan: 0, now, events: [event] });
    const monthlyEquivalent = tick.flowPerSecondYuan * 30 * 24 * 3600;

    expect(monthlyEquivalent).toBeCloseTo(20000, 3);
  });

  it("reduces per-second flow when monthly salary spreads from 5 weekdays to 7 weekdays", () => {
    const base = {
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 20000,
      effectiveAt: "2026-01-05T00:00:00.000Z",
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59",
      status: "active"
    };

    const now = new Date("2026-01-15T04:00:00.000Z");
    const fiveDayTick = computeBalanceTick({
      initialBalanceYuan: 0,
      now,
      events: [{ ...base, activeWeekdays: [1, 2, 3, 4, 5] }]
    });
    const sevenDayTick = computeBalanceTick({
      initialBalanceYuan: 0,
      now,
      events: [{ ...base, activeWeekdays: [1, 2, 3, 4, 5, 6, 7] }]
    });

    expect(fiveDayTick.flowPerSecondYuan).toBeGreaterThan(sevenDayTick.flowPerSecondYuan);
    expect(fiveDayTick.flowPerSecondYuan * 60).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 60);
    expect(fiveDayTick.flowPerSecondYuan * 3600).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 3600);
    expect(fiveDayTick.flowPerSecondYuan * 86400).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 86400);
  });
});
