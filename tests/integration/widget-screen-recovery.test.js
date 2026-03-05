import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("widget screen recovery", () => {
  it("includes safety fallback for off-screen window coordinates", () => {
    const rustPath = path.resolve("src-tauri/src/widget_window.rs");
    const code = fs.readFileSync(rustPath, "utf8");
    expect(code).toContain("safe_x");
    expect(code).toContain("safe_y");
    expect(code).toContain("20.0");
    expect(code).toContain("restore_widget_position_if_needed");
  });
});

