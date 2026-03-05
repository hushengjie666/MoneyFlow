import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget a11y controls", () => {
  it("renders minimal floating card-only widget html", () => {
    const htmlPath = path.resolve("frontend/widget.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html).toContain('data-tauri-drag-region');
    expect(html).toContain('id="widgetStatus"');
    expect(html).toContain('id="widgetBalance"');
    expect(html).toContain('id="widgetFlow"');
    expect(html).toContain('id="widgetJumpStair"');
    expect(html).toContain('id="widgetTimestamp"');
    expect(html).not.toContain('id="widgetTopmost"');
    expect(html).not.toContain('id="widgetQuickSubmit"');
  });
});
