import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ux state a11y", () => {
  it("styles define loading/error/success state hooks", () => {
    const cssPath = path.resolve("frontend/src/styles.css");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css).toContain('.status[data-type="error"]');
    expect(css).toContain('.status[data-type="success"]');
  });

  it("index includes status element and form labels", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    expect(html).toContain('id="statusText"');
    expect(html).toContain('class="menu-btn"');
    expect(html).toContain('id="homePanel"');
    expect(html).not.toContain('id="balanceValue"');
    expect(html).toContain('id="jumpCurrent"');
    expect(html).toContain('id="jumpDelta"');
    expect(html).toContain('id="jumpStair"');
    expect(html).toContain('id="jumpTimestamp"');
    expect(html).toContain("<label");
    expect(html).not.toContain(">保存配置<");
    expect(html).not.toContain(">保存显示设置<");
    expect(html).toContain('data-target="homePanel"');
    expect(html).toContain('data-target="configPanel"');
    expect(html).toContain('data-target="snapshotPanel"');
    expect(html).toContain('data-target="recentPanel"');

    const homeIndex = html.indexOf('data-target="homePanel"');
    const recentIndex = html.indexOf('data-target="recentPanel"');
    const snapshotIndex = html.indexOf('data-target="snapshotPanel"');
    const configIndex = html.indexOf('data-target="configPanel"');
    expect(homeIndex).toBeLessThan(recentIndex);
    expect(recentIndex).toBeLessThan(snapshotIndex);
    expect(snapshotIndex).toBeLessThan(configIndex);
  });
});
