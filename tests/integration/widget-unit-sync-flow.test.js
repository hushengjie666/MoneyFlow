import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget unit sync flow", () => {
  it("uses the same jump unit setting as main page and applies shared stair mapping", () => {
    const widgetPath = path.resolve("frontend/src/widget/widget-main.js");
    const widgetCode = fs.readFileSync(widgetPath, "utf8");
    const mainPath = path.resolve("frontend/src/main.js");
    const mainCode = fs.readFileSync(mainPath, "utf8");

    expect(widgetCode).toContain("moneyflow.ui.jumpUnit");
    expect(widgetCode).toContain("resolveWidgetJumpUnit");
    expect(widgetCode).toContain("jumpUnitLabel(jumpUnit)");
    expect(widgetCode).toContain("formatJumpByUnit(unitFlow, jumpUnit)");
    expect(widgetCode).toContain("resolveStairActiveSteps");
    expect(widgetCode).toContain("resolveStairTierFromActiveSteps");
    expect(widgetCode).toContain("const STAIR_STEP_COUNT = 14;");
    expect(widgetCode).toContain("widgetFlow.dataset.tier = tier;");
    expect(widgetCode).toContain("widgetJumpStair.dataset.tier = tier;");
    expect(widgetCode).toContain("renderJumpRhythm(unitFlow, jumpUnit)");
    expect(mainCode).toContain("const STAIR_STEP_COUNT = 14;");
    expect(mainCode).toContain("resolveStairTierFromActiveSteps");
    expect(mainCode).toContain("jumpDelta.dataset.tier = tier;");
  });
});
