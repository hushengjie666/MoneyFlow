import { describe, expect, it } from "vitest";
import { applyWidgetTick, createInitialWidgetRuntimeState } from "../../frontend/src/widget/widget-state.js";

describe("widget performance budget", () => {
  it("keeps state-apply p95 under 1ms for 1000 ticks", () => {
    const samples = [];
    let state = createInitialWidgetRuntimeState();

    for (let i = 0; i < 1000; i += 1) {
      const start = process.hrtime.bigint();
      state = applyWidgetTick(state, {
        timestamp: new Date().toISOString(),
        displayBalanceYuan: 1000 + i / 100,
        flowPerSecondYuan: 0.2
      });
      const end = process.hrtime.bigint();
      samples.push(Number(end - start) / 1_000_000);
    }

    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    expect(p95).toBeLessThan(1);
    expect(state.displayBalanceYuan).toBeGreaterThan(1000);
  });
});

