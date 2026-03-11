import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllLocalData,
  createEvent,
  getRealtimeBalance,
  getSnapshot,
  listEvents,
  patchEvent,
  putSnapshot
} from "../../frontend/src/api-client.js";

function createLocalStorageMock() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    }
  };
}

describe("frontend api recurring continuity", () => {
  beforeEach(async () => {
    globalThis.localStorage = createLocalStorageMock();
    await clearAllLocalData();
    await putSnapshot(0);
  });

  it("does not rollback historical accrued amount when recurring event is edited/deleted", async () => {
    const effectiveAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const created = await createEvent({
      title: "月度收入",
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 9000,
      effectiveAt,
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59",
      activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
    });

    const beforeEdit = await getSnapshot();
    await patchEvent(created.id, { amountYuan: 12000 });
    const afterEdit = await getSnapshot();
    expect(Math.abs(afterEdit.currentBalanceYuan - beforeEdit.currentBalanceYuan)).toBeLessThan(1);

    await patchEvent(created.id, { status: "deleted" });
    const afterDelete = await getSnapshot();
    expect(Math.abs(afterDelete.currentBalanceYuan - afterEdit.currentBalanceYuan)).toBeLessThan(1);

    const tick = await getRealtimeBalance();
    expect(tick.flowPerSecondYuan).toBe(0);
  });

  it("reinitializes current balance to target value without deleting existing events", async () => {
    await createEvent({
      title: "历史收入",
      eventKind: "one_time",
      direction: "inflow",
      amountYuan: 120,
      effectiveAt: new Date(Date.now() - 2000).toISOString()
    });

    const snapshot = await putSnapshot(500);
    expect(snapshot.currentBalanceYuan).toBe(500);

    const events = await listEvents();
    expect(events.some((event) => event.title === "历史收入")).toBe(true);
    expect(events.some((event) => event.title === "初始化对齐")).toBe(true);
  });

  it("keeps 20000 monthly inflow conversion precise in local fallback tick", async () => {
    await createEvent({
      title: "月工资",
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 20000,
      effectiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59",
      activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
    });

    const tick = await getRealtimeBalance();
    const activeSecondsInMonth = 30 * (23 * 3600 + 58 * 60);
    const expectedFlow = 20000 / activeSecondsInMonth;
    expect(tick.flowPerSecondYuan).toBeCloseTo(expectedFlow, 10);
  });

  it("reduces fallback per-minute/hour/day jump when weekdays change from 5 to 7", async () => {
    const effectiveAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const basePayload = {
      title: "月工资",
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 20000,
      effectiveAt,
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59"
    };

    await createEvent({ ...basePayload, activeWeekdays: [1, 2, 3, 4, 5] });
    const fiveDayTick = await getRealtimeBalance();

    await clearAllLocalData();
    await putSnapshot(0);
    await createEvent({ ...basePayload, activeWeekdays: [1, 2, 3, 4, 5, 6, 7] });
    const sevenDayTick = await getRealtimeBalance();

    expect(fiveDayTick.flowPerSecondYuan).toBeGreaterThan(sevenDayTick.flowPerSecondYuan);
    expect(fiveDayTick.flowPerSecondYuan * 60).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 60);
    expect(fiveDayTick.flowPerSecondYuan * 3600).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 3600);
    expect(fiveDayTick.flowPerSecondYuan * 86400).toBeGreaterThan(sevenDayTick.flowPerSecondYuan * 86400);
  });

  it("stops recurring contribution after recurrence end time", async () => {
    const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await createEvent({
      title: "临时补贴",
      eventKind: "recurring",
      direction: "inflow",
      amountYuan: 3000,
      effectiveAt: start.toISOString(),
      recurrenceUnit: "month",
      recurrenceInterval: 1,
      dailyStartTime: "00:01",
      dailyEndTime: "23:59",
      recurrenceEndAt: end.toISOString(),
      activeWeekdays: [1, 2, 3, 4, 5, 6, 7]
    });

    const tick = await getRealtimeBalance();
    expect(tick.flowPerSecondYuan).toBe(0);
  });
});
