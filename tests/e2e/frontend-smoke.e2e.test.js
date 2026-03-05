import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("frontend smoke e2e", () => {
  it("contains core app entry and help feedback flow elements", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const jsPath = path.resolve("frontend/src/main.js");
    const html = fs.readFileSync(htmlPath, "utf8");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(html).toContain('data-target="homePanel"');
    expect(html).toContain('data-target="helpPanel"');
    expect(html).toContain('id="helpFeedbackForm"');
    expect(js).toContain("submitHelpFeedback");
  });
});
