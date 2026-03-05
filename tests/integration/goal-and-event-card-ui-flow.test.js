import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("goal and event card ui flow", () => {
  it("uses integer currency display for goal current/target text", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(js).toContain("formatYuanDynamic(current, 0)");
    expect(js).toContain("formatYuanDynamic(currentGoalTarget, 0)");
  });

  it("renders event card with structured head/tags layout classes", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const cssPath = path.resolve("frontend/src/styles.css");
    const js = fs.readFileSync(jsPath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(js).toContain("event-row-head");
    expect(js).toContain("event-row-tags");
    expect(css).toContain(".event-row-head");
    expect(css).toContain(".event-row-tags");
  });

  it("keeps jump stair animation inside its container", () => {
    const cssPath = path.resolve("frontend/src/styles.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain(".jump-stair");
    expect(css).toContain("overflow: hidden;");
  });
});
