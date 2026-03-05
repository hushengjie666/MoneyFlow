import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget preference save strict flow", () => {
  it("does not silently swallow tauri save errors", () => {
    const jsPath = path.resolve("frontend/src/widget/widget-bridge.js");
    const code = fs.readFileSync(jsPath, "utf8");

    expect(code).toContain("const invoke = resolveInvoke();");
    expect(code).toContain("await invoke(\"save_widget_preferences\"");
    expect(code).not.toContain("invokeOrFallback(\"save_widget_preferences\"");
  });
});
