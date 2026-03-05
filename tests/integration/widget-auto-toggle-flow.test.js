import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget auto toggle flow", () => {
  it("binds main window minimize event to widget visibility", () => {
    const rustPath = path.resolve("src-tauri/src/widget_window.rs");
    const code = fs.readFileSync(rustPath, "utf8");
    expect(code).toContain("bind_widget_auto_toggle");
    expect(code).toContain("on_window_event");
    expect(code).toContain("is_minimized");
    expect(code).toContain("CloseRequested");
    expect(code).toContain("prevent_close");
    expect(code).toContain("sync_main_taskbar_with_visibility");
    expect(code).toContain("set_skip_taskbar(!show_taskbar)");
    expect(code).toContain(".skip_taskbar(true)");
    expect(code).toContain("window.set_skip_taskbar(true)");
    expect(code).toContain("main_window.hide()");
    expect(code).toContain("main_window.unminimize()");
    expect(code).toContain("show_widget_window");
    expect(code).toContain("hide_widget_window");
    expect(code).toContain("allow_simultaneous_display");
    expect(code).toContain("should_show_widget_when_main_hidden");
    expect(code).toContain("startup_mode == \"auto\" || allow_simultaneous_display");
    expect(code).toContain("if preferences.allow_simultaneous_display {");
    expect(code).toContain("show_widget_window_passive");
  });
});
