import { describe, expect, it } from "vitest";
import { filterRecentEvents, isSystemGeneratedEvent } from "../../frontend/src/event-visibility.js";

describe("recent event visibility", () => {
  it("identifies system-generated settlement and init-alignment events", () => {
    expect(isSystemGeneratedEvent({ title: "初始化对齐" })).toBe(true);
    expect(isSystemGeneratedEvent({ title: "工资（历史结转）" })).toBe(true);
    expect(isSystemGeneratedEvent({ title: "午餐支出" })).toBe(false);
  });

  it("hides system-generated events by default", () => {
    const events = [
      { id: 1, title: "初始化对齐" },
      { id: 2, title: "月薪（历史结转）" },
      { id: 3, title: "午餐" }
    ];
    const visible = filterRecentEvents(events);
    expect(visible.map((event) => event.id)).toEqual([3]);
  });

  it("keeps all events when setting enables system-generated visibility", () => {
    const events = [
      { id: 1, title: "初始化对齐" },
      { id: 2, title: "月薪（历史结转）" },
      { id: 3, title: "午餐" }
    ];
    const visible = filterRecentEvents(events, true);
    expect(visible.map((event) => event.id)).toEqual([1, 2, 3]);
  });
});
