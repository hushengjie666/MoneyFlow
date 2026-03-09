import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget build entry flow", () => {
  it("includes widget.html in vite multi-page build inputs", () => {
    const configPath = path.resolve("vite.config.js");
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toContain("rollupOptions");
    expect(config).toContain("input");
    expect(config).toContain("frontend/widget.html");
    expect(config).toContain("frontend/index.html");
  });
});
