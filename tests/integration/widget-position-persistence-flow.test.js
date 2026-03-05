import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget position persistence flow", () => {
  it("wires drag end to persist widget window coordinates", () => {
    const rustPath = path.resolve("src-tauri/src/main.rs");
    const bridgePath = path.resolve("frontend/src/widget/widget-bridge.js");
    const widgetMainPath = path.resolve("frontend/src/widget/widget-main.js");

    const rustCode = fs.readFileSync(rustPath, "utf8");
    const bridgeCode = fs.readFileSync(bridgePath, "utf8");
    const widgetMainCode = fs.readFileSync(widgetMainPath, "utf8");

    expect(rustCode).toContain("fn save_widget_window_position");
    expect(rustCode).toContain("read_widget_window_position");
    expect(rustCode).toContain("save_widget_window_position,");
    expect(bridgeCode).toContain("save_widget_window_position");
    expect(widgetMainCode).toContain("saveWidgetWindowPosition");
    expect(widgetMainCode).toContain("persistWidgetPosition");
  });
});
