import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("top frame layout sync flow", () => {
  it("uses shared top frame height CSS variable for shell and pages", () => {
    const cssPath = path.resolve("frontend/src/styles.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("--top-frame-height");
    expect(css).toContain("padding: var(--top-frame-height) 0 0;");
    expect(css).toContain("height: calc(100vh - var(--top-frame-height));");
  });

  it("syncs top frame height on init and window resize", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(js).toContain("function syncTopFrameLayout()");
    expect(js).toContain('document.documentElement.style.setProperty("--top-frame-height"');
    expect(js).toContain('window.addEventListener("resize", requestTopFrameLayoutSync)');
    expect(js).toContain("syncTopFrameLayout();");
  });
});
