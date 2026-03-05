import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("desktop tray flow", () => {
  it("wires tray menu actions and left click restore", () => {
    const rustPath = path.resolve("src-tauri/src/main.rs");
    const code = fs.readFileSync(rustPath, "utf8");
    expect(code).toContain("setup_system_tray");
    expect(code).toContain("apply_app_icons");
    expect(code).toContain("TrayIconBuilder");
    expect(code).toContain("tray-icon.png");
    expect(code).toContain(".icon(tray_icon)");
    expect(code).toContain("show_main");
    expect(code).toContain("show_widget");
    expect(code).toContain("quit_app");
    expect(code).toContain("MouseButton::Left");
    expect(code).toContain("open_main_window_impl");
  });
});
