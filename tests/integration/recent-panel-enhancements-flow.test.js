import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("recent panel enhancements flow", () => {
  it("adds quick-create entry and kind filter in recent panel", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('id="openEventModalBtnRecent"');
    expect(html).toContain('id="recentEventKindFilter"');
    expect(html).toContain('<option value="one_time">一次性</option>');
    expect(html).toContain('<option value="recurring">周期性</option>');
  });

  it("wires recent panel filter state and recurring badge rendering", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(js).toContain("RECENT_EVENT_KIND_FILTER_STORAGE_KEY");
    expect(js).toContain("openEventModalBtnRecent?.addEventListener");
    expect(js).toContain("recentEventKindFilter?.addEventListener");
    expect(js).toContain("formatRecurringCycleBadge");
    expect(js).toContain("event-cycle-badge");
  });
});
