import { describe, expect, it } from "vitest";
import { buildJumpPalette } from "../../frontend/src/jump-palette.js";

describe("jump palette", () => {
  it("returns stronger upflow glow when active steps increase", () => {
    const low = buildJumpPalette({ direction: "up", activeSteps: 2, totalSteps: 14 });
    const mid = buildJumpPalette({ direction: "up", activeSteps: 7, totalSteps: 14 });
    const high = buildJumpPalette({ direction: "up", activeSteps: 14, totalSteps: 14 });
    expect(high.stairHueFrom).toBeLessThan(low.stairHueFrom);
    expect(high.deltaGlow).not.toBe(low.deltaGlow);
    expect(mid.deltaColorMid).not.toBe(low.deltaColorMid);
    expect(high.deltaColorAccent).not.toBe(mid.deltaColorAccent);
    expect(high.deltaColorTop).not.toBe(low.deltaColorTop);
  });

  it("returns distinct palettes for up/down/flat", () => {
    const up = buildJumpPalette({ direction: "up", activeSteps: 8, totalSteps: 14 });
    const down = buildJumpPalette({ direction: "down", activeSteps: 8, totalSteps: 14 });
    const flat = buildJumpPalette({ direction: "flat", activeSteps: 8, totalSteps: 14 });
    expect(up.deltaColorTop).not.toBe(down.deltaColorTop);
    expect(up.deltaColorMid).not.toBe(flat.deltaColorMid);
    expect(flat.deltaColorBottom).not.toBe(down.deltaColorBottom);
    expect(up.stairHueTo).not.toBe(flat.stairHueTo);
  });
});
