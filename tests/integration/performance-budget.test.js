import { describe, expect, it } from "vitest";
import { computeBalanceTick } from "../../backend/src/services/balance-service.js";

function buildEvents(count) {
  const now = Date.now();
  return Array.from({ length: count }).map((_, index) => ({
    id: index + 1,
    eventKind: index % 2 === 0 ? "one_time" : "recurring",
    direction: index % 3 === 0 ? "outflow" : "inflow",
    amountYuan: 100 + (index % 100),
    effectiveAt: new Date(now - 60_000).toISOString(),
    recurrenceUnit: "day",
    recurrenceInterval: 1,
    status: "active"
  }));
}

describe("performance budget", () => {
  it("keeps balance computation under 50ms p95 for <=1000 events", () => {
    const events = buildEvents(1000);
    const samples = [];
    for (let i = 0; i < 80; i += 1) {
      const start = performance.now();
      computeBalanceTick({
        initialBalanceYuan: 100000,
        events,
        now: new Date()
      });
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    expect(p95).toBeLessThan(50);
  });
});
