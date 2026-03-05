import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("jump unit default and cross-component sync flow", () => {
  it("defaults jump unit to hour in main and widget", () => {
    const mainPath = path.resolve("frontend/src/main.js");
    const widgetPath = path.resolve("frontend/src/widget/widget-main.js");
    const indexPath = path.resolve("frontend/index.html");
    const widgetHtmlPath = path.resolve("frontend/widget.html");
    const mainCode = fs.readFileSync(mainPath, "utf8");
    const widgetCode = fs.readFileSync(widgetPath, "utf8");
    const indexHtml = fs.readFileSync(indexPath, "utf8");
    const widgetHtml = fs.readFileSync(widgetHtmlPath, "utf8");

    expect(mainCode).toContain('return "hour"');
    expect(widgetCode).toContain('return "hour"');
    expect(indexHtml).toContain('<option value="hour" selected>每时</option>');
    expect(widgetHtml).toContain("资金数字跳动 · 每时");
  });

  it("uses shared jump delta resolver in both main and widget", () => {
    const mainPath = path.resolve("frontend/src/main.js");
    const widgetPath = path.resolve("frontend/src/widget/widget-main.js");
    const mainCode = fs.readFileSync(mainPath, "utf8");
    const widgetCode = fs.readFileSync(widgetPath, "utf8");

    expect(mainCode).toContain("resolveJumpDisplayDeltaByUnit");
    expect(widgetCode).toContain("resolveJumpDisplayDeltaByUnit");
    expect(widgetCode).toContain("listEvents");
    expect(widgetCode).toContain("syncEventsIfNeeded");
  });
});
