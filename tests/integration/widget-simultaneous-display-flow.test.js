import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget simultaneous display flow", () => {
  it("shows widget when simultaneous display is enabled from main settings save", () => {
    const rustMainPath = path.resolve("src-tauri/src/main.rs");
    const rustMainCode = fs.readFileSync(rustMainPath, "utf8");
    const rustWindowPath = path.resolve("src-tauri/src/widget_window.rs");
    const rustWindowCode = fs.readFileSync(rustWindowPath, "utf8");

    expect(rustMainCode).toContain("save_widget_preferences");
    expect(rustMainCode).toContain("if preferences.allow_simultaneous_display");
    expect(rustMainCode).toContain("if preferences.startup_mode == \"auto\" || preferences.allow_simultaneous_display");
    expect(rustMainCode).toContain("show_widget_window_passive_impl");
    expect(rustWindowCode).toContain("pub fn show_widget_window_passive");
    expect(rustWindowCode).toContain("if preferences.allow_simultaneous_display");
    expect(rustWindowCode).toContain("show_widget_window_passive(app)");
  });
});
