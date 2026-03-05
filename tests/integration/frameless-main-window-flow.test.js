import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("frameless main window flow", () => {
  it("uses frameless config for main window", () => {
    const configPath = path.resolve("src-tauri/tauri.conf.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const mainWindow = config?.app?.windows?.find((window) => window.label === "main");
    expect(mainWindow).toBeTruthy();
    expect(mainWindow.decorations).toBe(false);
  });

  it("wires custom window controls to tauri commands", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html).toContain("id=\"windowMinBtn\"");
    expect(html).toContain("id=\"windowMaxBtn\"");
    expect(html).toContain("id=\"windowCloseBtn\"");
    expect(html).toContain("data-tauri-drag-region");

    const rustPath = path.resolve("src-tauri/src/main.rs");
    const rust = fs.readFileSync(rustPath, "utf8");
    expect(rust).toContain("minimize_main_window");
    expect(rust).toContain("toggle_main_window_maximized");
    expect(rust).toContain("close_main_window_to_tray");
    expect(rust).toContain("start_main_window_dragging");

    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");
    expect(js).toContain("minimizeMainWindow");
    expect(js).toContain("toggleMainWindowMaximized");
    expect(js).toContain("closeMainWindowToTray");
    expect(js).toContain("startMainWindowDragging");
    expect(js).toContain("appHeadDrag?.addEventListener(\"mousedown\"");
  });
});
