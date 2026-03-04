import { describe, expect, it } from "vitest";
import { validateEventCreatePayload } from "../../backend/src/lib/validators.js";

describe("one-time event validation", () => {
  it("rejects non-numeric amount", () => {
    expect(
      validateEventCreatePayload({
        title: "invalid amount",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: "10",
        effectiveAt: new Date().toISOString()
      })
    ).toContain("amountYuan");
  });

  it("rejects negative or zero amount", () => {
    expect(
      validateEventCreatePayload({
        title: "invalid amount",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 0,
        effectiveAt: new Date().toISOString()
      })
    ).toContain(">= 0.01");
  });

  it("rejects more than 2 decimal places", () => {
    expect(
      validateEventCreatePayload({
        title: "too many decimals",
        eventKind: "one_time",
        direction: "inflow",
        amountYuan: 12.345,
        effectiveAt: new Date().toISOString()
      })
    ).toContain("2 decimal");
  });

  it("rejects daily time window fields for one_time events", () => {
    expect(
      validateEventCreatePayload({
        title: "one-time cannot have window",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 12.34,
        effectiveAt: new Date().toISOString(),
        dailyStartTime: "08:00",
        dailyEndTime: "17:00"
      })
    ).toContain("one_time event");
  });

  it("accepts valid payload", () => {
    expect(
      validateEventCreatePayload({
        title: "valid amount",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 123.45,
        effectiveAt: new Date().toISOString()
      })
    ).toBeNull();
  });

  it("accepts payload without title", () => {
    expect(
      validateEventCreatePayload({
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 99.99,
        effectiveAt: new Date().toISOString()
      })
    ).toBeNull();
  });
});
