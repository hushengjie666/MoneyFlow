import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget dblclick open main flow", () => {
  it("binds dblclick open-main action and keeps drag behavior", () => {
    const jsPath = path.resolve("frontend/src/widget/widget-main.js");
    const code = fs.readFileSync(jsPath, "utf8");
    expect(code).toContain("addEventListener(\"dblclick\", handleOpenMain)");
    expect(code).toContain("addEventListener(\"mousedown\", beginPress)");
    expect(code).toContain("addEventListener(\"mousemove\", handlePointerMove)");
    expect(code).toContain("startWidgetDragging");
    expect(code).toContain("dx + dy < 3");
  });
});
