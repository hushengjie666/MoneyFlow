import { describe, expect, it } from "vitest";
import { resolveStairActiveSteps, resolveStairTierFromActiveSteps } from "../../frontend/src/jump-stair.js";

describe("jump stair mapping", () => {
  it("keeps same stair level for equivalent monthly income across dimensions", () => {
    const monthlyEquivalent = 33.7 * 8 * 5 * (30 / 7);
    const levelHour = resolveStairActiveSteps({
      unitDelta: 33.7,
      jumpUnit: "hour",
      stepCount: 14
    });
    const levelMonth = resolveStairActiveSteps({
      unitDelta: monthlyEquivalent,
      jumpUnit: "month",
      stepCount: 14
    });
    const levelYear = resolveStairActiveSteps({
      unitDelta: monthlyEquivalent * 12,
      jumpUnit: "year",
      stepCount: 14
    });

    expect(levelHour).toBe(levelMonth);
    expect(levelMonth).toBe(levelYear);
  });

  it("maps 33.7 yuan/hour to low-middle level under worktime dimension system", () => {
    const level = resolveStairActiveSteps({
      unitDelta: 33.7,
      jumpUnit: "hour",
      stepCount: 14
    });
    expect(level).toBe(2);
  });

  it("maps active steps to stable tier names", () => {
    expect(resolveStairTierFromActiveSteps(1, 14)).toBe("base");
    expect(resolveStairTierFromActiveSteps(5, 14)).toBe("bronze");
    expect(resolveStairTierFromActiveSteps(7, 14)).toBe("silver");
    expect(resolveStairTierFromActiveSteps(9, 14)).toBe("gold");
    expect(resolveStairTierFromActiveSteps(11, 14)).toBe("platinum");
    expect(resolveStairTierFromActiveSteps(14, 14)).toBe("diamond");
  });
});
