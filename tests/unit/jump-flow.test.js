import { describe, expect, it } from "vitest";
import { resolveJumpDisplayDeltaByUnit, resolveJumpDisplayFlowPerSecond } from "../../frontend/src/jump-flow.js";

describe("jump flow display resolver", () => {
  it("uses unified workday-average flow for second/minute/hour/day units", () => {
    const events = [
      {
        eventKind: "recurring",
        status: "active",
        direction: "inflow",
        amountYuan: 3000,
        effectiveAt: "2026-01-01T00:00:00.000Z",
        recurrenceUnit: "month",
        recurrenceInterval: 1,
        dailyStartTime: "09:00",
        dailyEndTime: "18:00",
        activeWeekdays: [1, 2, 3, 4, 5]
      }
    ];
    const now = new Date("2026-03-05T04:00:00.000Z"); // local Thursday

    const secondDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "second",
      realtimeFlowPerSecondYuan: 0.99,
      events,
      now
    });
    const minuteDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "minute",
      realtimeFlowPerSecondYuan: 0.99,
      events,
      now
    });
    const hourDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "hour",
      realtimeFlowPerSecondYuan: 0.99,
      events,
      now
    });
    const dayDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "day",
      realtimeFlowPerSecondYuan: 0.99,
      events,
      now
    });

    expect(secondDelta).toBeCloseTo(3000 / (5 * (30 / 7) * 9 * 3600), 9);
    expect(minuteDelta).toBeCloseTo(secondDelta * 60, 9);
    expect(hourDelta).toBeCloseTo(3000 / (5 * (30 / 7) * 9), 9);
    expect(dayDelta).toBeCloseTo(3000 / (5 * (30 / 7)), 9);
  });

  it("uses nominal recurring flow for long-range month/year/week units", () => {
    const events = [
      {
        eventKind: "recurring",
        status: "active",
        direction: "inflow",
        amountYuan: 20000,
        effectiveAt: "2026-01-01T00:00:00.000Z",
        recurrenceUnit: "month",
        recurrenceInterval: 1,
        activeWeekdays: [1, 2, 3, 4, 5]
      }
    ];
    const now = new Date("2026-02-01T00:00:00.000Z");
    const monthlyFromFiveDays = resolveJumpDisplayFlowPerSecond({
      jumpUnit: "month",
      realtimeFlowPerSecondYuan: 0.5,
      events,
      now
    });
    const monthlyFromSevenDays = resolveJumpDisplayFlowPerSecond({
      jumpUnit: "month",
      realtimeFlowPerSecondYuan: 0.5,
      events: [{ ...events[0], activeWeekdays: [1, 2, 3, 4, 5, 6, 7] }],
      now
    });

    expect(monthlyFromFiveDays).toBeCloseTo(monthlyFromSevenDays, 10);
    expect(monthlyFromFiveDays * 30 * 24 * 3600).toBeCloseTo(20000, 6);

    const yearlyFlow = resolveJumpDisplayFlowPerSecond({
      jumpUnit: "year",
      realtimeFlowPerSecondYuan: 0.5,
      events,
      now
    });
    expect(yearlyFlow * 360 * 24 * 3600).toBeCloseTo(240000, 6);
  });

  it("shows day-unit jump outside daily start/end window", () => {
    const now = new Date("2026-01-13T18:30:00.000Z"); // local Asia/Shanghai 02:30
    const flow = resolveJumpDisplayFlowPerSecond({
      jumpUnit: "day",
      realtimeFlowPerSecondYuan: 0,
      events: [
        {
          eventKind: "recurring",
          status: "active",
          direction: "inflow",
          amountYuan: 20000,
          effectiveAt: "2026-01-01T00:00:00.000Z",
          recurrenceUnit: "month",
          recurrenceInterval: 1,
          dailyStartTime: "09:00",
          dailyEndTime: "18:00",
          activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
        }
      ],
      now
    });

    expect(flow).toBeGreaterThan(0);
  });

  it("keeps day-unit based on weekday average so 3000/month and 5 weekdays is 140/day", () => {
    const now = new Date("2026-03-05T04:00:00.000Z"); // local Asia/Shanghai Thursday
    const flow = resolveJumpDisplayFlowPerSecond({
      jumpUnit: "day",
      realtimeFlowPerSecondYuan: 0,
      events: [
        {
          eventKind: "recurring",
          status: "active",
          direction: "inflow",
          amountYuan: 3000,
          effectiveAt: "2026-01-01T00:00:00.000Z",
          recurrenceUnit: "month",
          recurrenceInterval: 1,
          dailyStartTime: "09:00",
          dailyEndTime: "18:00",
          activeWeekdays: [1, 2, 3, 4, 5]
        }
      ],
      now
    });

    const dayAmount = flow * 86400;
    expect(dayAmount).toBeCloseTo(140, 6);
  });

  it("makes hour unit follow configured daily active hours", () => {
    const now = new Date("2026-03-05T04:00:00.000Z");
    const hourDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "hour",
      realtimeFlowPerSecondYuan: 0,
      events: [
        {
          eventKind: "recurring",
          status: "active",
          direction: "inflow",
          amountYuan: 3000,
          effectiveAt: "2026-01-01T00:00:00.000Z",
          recurrenceUnit: "month",
          recurrenceInterval: 1,
          dailyStartTime: "11:00",
          dailyEndTime: "19:00",
          activeWeekdays: [1, 2, 3, 4, 5]
        }
      ],
      now
    });

    expect(hourDelta).toBeCloseTo(17.5, 6);
  });

  it("returns zero for second/minute/hour outside configured daily time window", () => {
    const now = new Date("2026-03-05T15:30:00.000Z"); // local Asia/Shanghai 23:30
    const events = [
      {
        eventKind: "recurring",
        status: "active",
        direction: "inflow",
        amountYuan: 3000,
        effectiveAt: "2026-01-01T00:00:00.000Z",
        recurrenceUnit: "month",
        recurrenceInterval: 1,
        dailyStartTime: "08:00",
        dailyEndTime: "18:00",
        activeWeekdays: [1, 2, 3, 4, 5]
      }
    ];

    const secondDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "second",
      realtimeFlowPerSecondYuan: 0.12,
      events,
      now
    });
    const minuteDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "minute",
      realtimeFlowPerSecondYuan: 0.12,
      events,
      now
    });
    const hourDelta = resolveJumpDisplayDeltaByUnit({
      jumpUnit: "hour",
      realtimeFlowPerSecondYuan: 0.12,
      events,
      now
    });

    expect(secondDelta).toBe(0);
    expect(minuteDelta).toBe(0);
    expect(hourDelta).toBe(0);
  });

  it("returns zero for second/minute/hour on non-active weekdays", () => {
    const now = new Date("2026-03-07T04:00:00.000Z"); // local Asia/Shanghai Saturday noon
    const events = [
      {
        eventKind: "recurring",
        status: "active",
        direction: "inflow",
        amountYuan: 3000,
        effectiveAt: "2026-01-01T00:00:00.000Z",
        recurrenceUnit: "month",
        recurrenceInterval: 1,
        dailyStartTime: "08:00",
        dailyEndTime: "18:00",
        activeWeekdays: [1, 2, 3, 4, 5]
      }
    ];

    expect(
      resolveJumpDisplayDeltaByUnit({
        jumpUnit: "second",
        realtimeFlowPerSecondYuan: 0.12,
        events,
        now
      })
    ).toBe(0);
    expect(
      resolveJumpDisplayDeltaByUnit({
        jumpUnit: "minute",
        realtimeFlowPerSecondYuan: 0.12,
        events,
        now
      })
    ).toBe(0);
    expect(
      resolveJumpDisplayDeltaByUnit({
        jumpUnit: "hour",
        realtimeFlowPerSecondYuan: 0.12,
        events,
        now
      })
    ).toBe(0);
  });
});
