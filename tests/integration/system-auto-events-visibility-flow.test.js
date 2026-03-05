import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("system auto events visibility flow", () => {
  it("wires settings toggle and event list filtering for carry-over system events", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const jsPath = path.resolve("frontend/src/main.js");
    const html = fs.readFileSync(htmlPath, "utf8");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(html).toContain('id="showSystemEventsToggle"');
    expect(js).toContain("SHOW_SYSTEM_EVENTS_STORAGE_KEY");
    expect(js).toContain("if (stored === null) return false;");
    expect(js).toContain("showSystemEventsToggle?.addEventListener");
    expect(js).toContain("includes(\"（历史结转）\")");
  });
});
