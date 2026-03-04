import { describe, expect, it } from "vitest";
import { formatEventSummary } from "../../frontend/src/formatters.js";

describe("event summary mapper", () => {
  it("formats recurring event summary", () => {
    const text = formatEventSummary({
      direction: "inflow",
      amountYuan: 12345,
      eventKind: "recurring",
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active"
    });
    expect(text).toContain("+");
    expect(text).toContain("recurring");
    expect(text).toContain("active");
  });
});
