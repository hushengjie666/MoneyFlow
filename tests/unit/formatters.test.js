import { describe, expect, it } from "vitest";
import { formatEtaDuration, formatJumpByUnit, formatYuanDynamic } from "../../frontend/src/formatters.js";

describe("formatters", () => {
  it("drops trailing zero in dynamic yuan display", () => {
    expect(formatYuanDynamic(12.3, 2)).toContain("12.3");
    expect(formatYuanDynamic(12.3, 2)).not.toContain("12.30");
  });

  it("formats jump delta without forced trailing zeros", () => {
    expect(formatJumpByUnit(1.23, "second")).toContain("1.23 元/秒");
    expect(formatJumpByUnit(1.23, "second")).not.toContain("1.230");
  });

  it("adapts jump delta fraction digits by integer length", () => {
    expect(formatJumpByUnit(12.34, "second")).toContain("12.3 元/秒");
    expect(formatJumpByUnit(123.45, "second")).toContain("123 元/秒");
  });

  it("formats ETA to month/year for long durations", () => {
    expect(formatEtaDuration(31 * 86400)).toContain("1个月");
    expect(formatEtaDuration(400 * 86400)).toContain("1年");
  });
});
