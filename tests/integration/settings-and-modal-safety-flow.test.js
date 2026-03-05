import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("settings and modal safety flow", () => {
  it("keeps jump unit auto-save without explicit save button", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('id="jumpConfigForm"');
    expect(html).toContain('id="jumpUnit"');
    expect(html).not.toContain(">保存配置<");
  });

  it("includes simultaneous display toggle in settings", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(html).toContain('id="widgetAllowSimultaneousMain"');
    expect(html).toContain('<input id="widgetAllowSimultaneousMain" type="checkbox" />');
    expect(html).toContain("允许主页面与悬浮组件同时展示");
    expect(js).toContain("widgetAllowSimultaneousMain");
    expect(js).toContain("allowSimultaneousDisplay");
    expect(js).toContain("await showWidgetWindow()");
    expect(js).toContain("await hideWidgetWindow()");
  });

  it("includes auto-switch-home toggle with checked default and uses conditional panel switch", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(html).toContain('id="autoSwitchHomeAfterEventSaveToggle"');
    expect(html).toContain('id="autoSwitchHomeAfterEventSaveToggle" type="checkbox" checked');
    expect(html).toContain("新增/编辑近期资金事件后自动跳转到主页");
    expect(js).toContain("AUTO_SWITCH_HOME_AFTER_EVENT_SAVE_STORAGE_KEY");
    expect(js).toContain("shouldAutoSwitchHomeAfterEventSave()");
    expect(js).toContain('if (shouldAutoSwitchHomeAfterEventSave()) {');
  });

  it("places event display config section below desktop widget section", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    const widgetIndex = html.indexOf("桌面悬浮组件");
    const eventDisplayIndex = html.indexOf("事件展示配置");

    expect(widgetIndex).toBeGreaterThan(-1);
    expect(eventDisplayIndex).toBeGreaterThan(-1);
    expect(eventDisplayIndex).toBeGreaterThan(widgetIndex);
  });

  it("does not close event modal when clicking backdrop", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(js).toContain('eventModal?.addEventListener("click"');
    expect(js).not.toContain("if (event.target === eventModal)");
    expect(js).toContain("event.stopPropagation()");
  });
});
