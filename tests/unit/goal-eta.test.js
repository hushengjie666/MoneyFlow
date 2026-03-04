import { describe, expect, it } from "vitest";
import { estimateGoalEtaBySchedule } from "../../frontend/src/goal-eta.js";

describe("goal eta by recurring schedule", () => {
  it("returns 0 when target is already reached", () => {
    const eta = estimateGoalEtaBySchedule(100, 90, [], new Date("2026-01-01T00:00:00.000Z"));
    expect(eta).toBe(0);
  });

  it("returns null when there is no active recurring flow", () => {
    const eta = estimateGoalEtaBySchedule(100, 110, [], new Date("2026-01-01T00:00:00.000Z"));
    expect(eta).toBeNull();
  });

  it("includes future-effective recurring events and daily windows", () => {
    const eta = estimateGoalEtaBySchedule(
      100,
      110,
      [
        {
          eventKind: "recurring",
          status: "active",
          direction: "inflow",
          amountYuan: 3600,
          effectiveAt: "2026-01-02T00:00:00.000Z",
          recurrenceUnit: "day",
          recurrenceInterval: 1,
          dailyStartTime: "08:00",
          dailyEndTime: "09:00",
          activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
        }
      ],
      new Date("2026-01-01T23:00:00.000Z")
    );

    expect(eta).toBeGreaterThanOrEqual(3600);
    expect(eta).toBeLessThanOrEqual(3620);
  });

  it("skips weekends when weekday selection excludes them", () => {
    const eta = estimateGoalEtaBySchedule(
      100,
      101,
      [
        {
          eventKind: "recurring",
          status: "active",
          direction: "inflow",
          amountYuan: 3600,
          effectiveAt: "2026-01-09T00:00:00.000Z",
          recurrenceUnit: "day",
          recurrenceInterval: 1,
          dailyStartTime: "08:00",
          dailyEndTime: "09:00",
          activeWeekdays: [1, 2, 3, 4, 5]
        }
      ],
      new Date("2026-01-10T00:00:00.000Z")
    );

    expect(eta).toBeGreaterThan(100000);
  });
});
