const STORAGE_KEY = "moneyflow.local.v2";
const DAY_SECONDS = 24 * 60 * 60;
const SECOND_MS = 1000;
const MONEY_PRECISION = 10000;
const FLOW_PRECISION = 10000000000;
const ASIA_SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;
const DEFAULT_SETTINGS = {
  savingsGoalTargetYuan: null,
  updatedAt: null
};

const memoryFallback = {
  snapshot: null,
  events: [],
  nextEventId: 1,
  settings: { ...DEFAULT_SETTINGS }
};

function cloneStoreShape(source) {
  return {
    snapshot: source.snapshot ? { ...source.snapshot } : null,
    events: Array.isArray(source.events) ? source.events.map((event) => ({ ...event })) : [],
    nextEventId: Number(source.nextEventId ?? 1),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(source.settings ?? {})
    }
  };
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * MONEY_PRECISION) / MONEY_PRECISION;
}

function roundFlow(value) {
  return Math.round((value + Number.EPSILON) * FLOW_PRECISION) / FLOW_PRECISION;
}

function toEpochSeconds(iso) {
  return Math.floor(new Date(iso).getTime() / SECOND_MS);
}

function periodSeconds(unit, interval) {
  if (unit === "day") return DAY_SECONDS * interval;
  if (unit === "week") return DAY_SECONDS * 7 * interval;
  if (unit === "month") return DAY_SECONDS * 30 * interval;
  return DAY_SECONDS;
}

function eventSign(direction) {
  return direction === "inflow" ? 1 : -1;
}

function parseDailyTimeToSeconds(value, { allow24 }) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  if (hour === 24 && minute === 0 && allow24) return DAY_SECONDS;
  if (hour < 0 || hour > 23) return null;
  return hour * 3600 + minute * 60;
}

function getDailyWindow(event) {
  const startSec =
    parseDailyTimeToSeconds(event.dailyStartTime ?? "00:01", { allow24: false }) ?? 60;
  const endSec =
    parseDailyTimeToSeconds(event.dailyEndTime ?? "24:00", { allow24: true }) ?? DAY_SECONDS;
  if (endSec <= startSec) {
    return { startSec: 60, endSec: DAY_SECONDS, activeLengthSec: DAY_SECONDS - 60 };
  }
  return { startSec, endSec, activeLengthSec: endSec - startSec };
}

function parseActiveWeekdays(event) {
  const source = event.activeWeekdays ?? [1, 2, 3, 4, 5, 6, 7];
  const days = Array.isArray(source)
    ? source
    : String(source)
      .split(",")
      .map((item) => Number(item.trim()));
  const valid = days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  return new Set(valid.length ? valid : [1, 2, 3, 4, 5, 6, 7]);
}

function overlapSeconds(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function toLocalDayAlignedSeconds(epochSeconds) {
  return epochSeconds + ASIA_SHANGHAI_OFFSET_SECONDS;
}

function isoWeekdayFromDayIndex(dayIndex) {
  return ((dayIndex + 3) % 7 + 7) % 7 + 1;
}

function countActiveDaysInPeriod(startDayIndex, periodDays, weekdaySet) {
  let activeDayCount = 0;
  for (let offset = 0; offset < periodDays; offset += 1) {
    if (weekdaySet.has(isoWeekdayFromDayIndex(startDayIndex + offset))) {
      activeDayCount += 1;
    }
  }
  return activeDayCount;
}

function computeActiveSecondsPerPeriod(event, dailyStartSec, dailyEndSec, weekdaySet) {
  const totalSeconds = periodSeconds(event.recurrenceUnit, event.recurrenceInterval);
  const periodDays = Math.max(1, Math.floor(totalSeconds / DAY_SECONDS));
  const activeLengthSec = Math.max(1, dailyEndSec - dailyStartSec);
  const eventLocalSec = toLocalDayAlignedSeconds(toEpochSeconds(event.effectiveAt));
  const eventStartDay = Math.floor(eventLocalSec / DAY_SECONDS);
  const activeDayCount = Math.max(1, countActiveDaysInPeriod(eventStartDay, periodDays, weekdaySet));
  return activeDayCount * activeLengthSec;
}

function activeSecondsBetween(startSec, endSec, dailyStartSec, dailyEndSec, weekdaySet) {
  if (endSec <= startSec || dailyEndSec <= dailyStartSec) return 0;
  const localStartSec = toLocalDayAlignedSeconds(startSec);
  const localEndSec = toLocalDayAlignedSeconds(endSec);
  const startDay = Math.floor(localStartSec / DAY_SECONDS);
  const endDay = Math.floor((localEndSec - 1) / DAY_SECONDS);

  let total = 0;
  for (let day = startDay; day <= endDay; day += 1) {
    if (!weekdaySet.has(isoWeekdayFromDayIndex(day))) continue;
    const dayWindowStart = day * DAY_SECONDS + dailyStartSec;
    const dayWindowEnd = day * DAY_SECONDS + dailyEndSec;
    total += overlapSeconds(localStartSec, localEndSec, dayWindowStart, dayWindowEnd);
  }
  return total;
}

function isInDailyWindow(nowSec, dailyStartSec, dailyEndSec, weekdaySet) {
  const localNowSec = toLocalDayAlignedSeconds(nowSec);
  const dayIndex = Math.floor(localNowSec / DAY_SECONDS);
  if (!weekdaySet.has(isoWeekdayFromDayIndex(dayIndex))) return false;
  const secOfDay = ((localNowSec % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  return secOfDay >= dailyStartSec && secOfDay < dailyEndSec;
}

function oneTimeContribution(event, nowSec) {
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;
  return roundMoney(event.amountYuan * eventSign(event.direction));
}

function recurringContribution(event, nowSec) {
  if (event.status !== "active") return 0;
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;

  const { startSec: dailyStartSec, endSec: dailyEndSec } = getDailyWindow(event);
  const weekdaySet = parseActiveWeekdays(event);
  const elapsedActive = activeSecondsBetween(eventSec, nowSec, dailyStartSec, dailyEndSec, weekdaySet);
  if (elapsedActive <= 0) return 0;

  const activeSecondsPerPeriod = computeActiveSecondsPerPeriod(event, dailyStartSec, dailyEndSec, weekdaySet);
  return roundMoney((elapsedActive * event.amountYuan * eventSign(event.direction)) / activeSecondsPerPeriod);
}

function computeEventContribution(event, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / SECOND_MS);
  if (event.eventKind === "one_time") return oneTimeContribution(event, nowSec);
  if (event.eventKind === "recurring") return recurringContribution(event, nowSec);
  return 0;
}

function normalizeWeekdays(value) {
  const source = Array.isArray(value) ? value : [1, 2, 3, 4, 5, 6, 7];
  return source
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
}

function sameWeekdays(a, b) {
  const left = normalizeWeekdays(a);
  const right = normalizeWeekdays(b);
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function hasRecurringFinancialChange(previous, patchPayload) {
  if (previous.eventKind !== "recurring") return false;
  const scalarFields = [
    "amountYuan",
    "direction",
    "recurrenceUnit",
    "recurrenceInterval",
    "dailyStartTime",
    "dailyEndTime"
  ];
  for (const field of scalarFields) {
    if (Object.hasOwn(patchPayload, field) && patchPayload[field] !== previous[field]) {
      return true;
    }
  }
  if (Object.hasOwn(patchPayload, "activeWeekdays")) {
    return !sameWeekdays(previous.activeWeekdays, patchPayload.activeWeekdays);
  }
  return false;
}

function buildSettlementEvent(previous, accrued, nowIso, id) {
  if (Math.abs(accrued) < 0.0001) return null;
  return {
    id,
    title: `${String(previous.title ?? "周期事件").trim() || "周期事件"}（历史结转）`,
    eventKind: "one_time",
    direction: accrued >= 0 ? "inflow" : "outflow",
    amountYuan: roundMoney(Math.abs(accrued)),
    effectiveAt: nowIso,
    recurrenceUnit: null,
    recurrenceInterval: null,
    dailyStartTime: null,
    dailyEndTime: null,
    activeWeekdays: null,
    status: "active",
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function computeBalanceTick({ initialBalanceYuan, events, now = new Date() }) {
  const nowSec = Math.floor(now.getTime() / SECOND_MS);
  let oneTimeCount = 0;
  let recurringCount = 0;
  let flowPerSecondYuan = 0;
  let total = Number(initialBalanceYuan ?? 0);

  for (const event of events) {
    if (event.status === "deleted") continue;
    if (event.eventKind === "one_time") {
      const delta = oneTimeContribution(event, nowSec);
      if (delta !== 0 || toEpochSeconds(event.effectiveAt) <= nowSec) {
        total = roundMoney(total + delta);
        oneTimeCount += 1;
      }
      continue;
    }

    if (event.eventKind === "recurring") {
      if (event.status !== "active") continue;
      const eventSec = toEpochSeconds(event.effectiveAt);
      if (eventSec > nowSec) continue;
      const delta = recurringContribution(event, nowSec);
      total = roundMoney(total + delta);
      const { startSec, endSec } = getDailyWindow(event);
      const weekdaySet = parseActiveWeekdays(event);
      const activeSecondsPerPeriod = computeActiveSecondsPerPeriod(event, startSec, endSec, weekdaySet);
      if (isInDailyWindow(nowSec, startSec, endSec, weekdaySet)) {
        recurringCount += 1;
        flowPerSecondYuan += (event.amountYuan * eventSign(event.direction)) / activeSecondsPerPeriod;
      }
    }
  }

  return {
    timestamp: new Date(nowSec * SECOND_MS).toISOString(),
    displayBalanceYuan: total,
    flowPerSecondYuan: roundFlow(flowPerSecondYuan),
    sourceSummary: {
      activeRecurringCount: recurringCount,
      effectiveOneTimeCount: oneTimeCount
    }
  };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneStoreShape(memoryFallback);
    }
    const parsed = JSON.parse(raw);
    return {
      snapshot: parsed.snapshot ?? null,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      nextEventId: Number(parsed.nextEventId ?? 1),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {})
      }
    };
  } catch {
    return cloneStoreShape(memoryFallback);
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    memoryFallback.snapshot = store.snapshot;
    memoryFallback.events = store.events;
    memoryFallback.nextEventId = store.nextEventId;
    memoryFallback.settings = store.settings;
  }
}

function normalizeGoalValue(value) {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundMoney(amount);
}

function ensureSnapshot(store) {
  if (store.snapshot) return store.snapshot;
  const now = new Date().toISOString();
  const snapshot = {
    initialBalanceYuan: 0,
    currentBalanceYuan: 0,
    timezone: "Asia/Shanghai",
    updatedAt: now
  };
  store.snapshot = snapshot;
  writeStore(store);
  return snapshot;
}

function fail(message) {
  throw new Error(message);
}

function validateDailyWindow(start, end) {
  const s = parseDailyTimeToSeconds(start, { allow24: false });
  const e = parseDailyTimeToSeconds(end, { allow24: true });
  if (s == null) fail("dailyStartTime 必须是 00:01-23:59，格式 HH:mm");
  if (e == null) fail("dailyEndTime 必须是 00:01-24:00，格式 HH:mm");
  if (s <= 0) fail("每日开始时间不能为 00:00，请至少填写 00:01");
  if (s >= e) fail("dailyStartTime 必须早于 dailyEndTime");
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== "object") fail("payload must be object");
  if (payload.title != null && typeof payload.title !== "string") fail("title must be string");
  if (typeof payload.title === "string" && payload.title.trim().length > 80) fail("title must be <= 80 chars");
  if (!["one_time", "recurring"].includes(payload.eventKind)) fail("eventKind must be one_time/recurring");
  if (!["inflow", "outflow"].includes(payload.direction)) fail("direction must be inflow/outflow");
  if (!(typeof payload.amountYuan === "number" && Number.isFinite(payload.amountYuan) && payload.amountYuan >= 0.01)) {
    fail("amountYuan must be >= 0.01");
  }
  if (!payload.effectiveAt || Number.isNaN(Date.parse(payload.effectiveAt))) fail("effectiveAt must be ISO datetime");
  if (payload.eventKind === "one_time") {
    if (
      payload.recurrenceUnit != null ||
      payload.recurrenceInterval != null ||
      payload.dailyStartTime != null ||
      payload.dailyEndTime != null ||
      payload.activeWeekdays != null
    ) {
      fail("one_time event must not include recurrence fields");
    }
    return;
  }

  if (!["day", "week", "month"].includes(payload.recurrenceUnit)) fail("recurrenceUnit must be day/week/month");
  if (!Number.isInteger(payload.recurrenceInterval) || payload.recurrenceInterval < 1) {
    fail("recurrenceInterval must be integer >= 1");
  }
  const start = payload.dailyStartTime ?? "00:01";
  const end = payload.dailyEndTime ?? "24:00";
  validateDailyWindow(start, end);
  const weekdays = payload.activeWeekdays ?? [1, 2, 3, 4, 5, 6, 7];
  if (!Array.isArray(weekdays) || weekdays.length === 0) fail("activeWeekdays must contain at least one weekday");
  for (const day of weekdays) {
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      fail("activeWeekdays must use integers 1..7");
    }
  }
}

function normalizeRecurringFields(payload) {
  if (payload.eventKind !== "recurring") {
    return {
      recurrenceUnit: null,
      recurrenceInterval: null,
      dailyStartTime: null,
      dailyEndTime: null
    };
  }
  return {
    recurrenceUnit: payload.recurrenceUnit,
    recurrenceInterval: payload.recurrenceInterval,
    dailyStartTime: payload.dailyStartTime ?? "00:01",
    dailyEndTime: payload.dailyEndTime ?? "24:00",
    activeWeekdays: Array.isArray(payload.activeWeekdays) && payload.activeWeekdays.length ? payload.activeWeekdays : [1, 2, 3, 4, 5, 6, 7]
  };
}

function recomputeSnapshot(store, now = new Date()) {
  const snapshot = ensureSnapshot(store);
  const tick = computeBalanceTick({
    initialBalanceYuan: snapshot.initialBalanceYuan,
    events: store.events,
    now
  });
  snapshot.currentBalanceYuan = tick.displayBalanceYuan;
  snapshot.updatedAt = now.toISOString();
  store.snapshot = snapshot;
  writeStore(store);
  return snapshot;
}

export async function getSnapshot() {
  const store = readStore();
  return recomputeSnapshot(store);
}

export async function putSnapshot(initialBalanceYuan) {
  if (!(typeof initialBalanceYuan === "number" && Number.isFinite(initialBalanceYuan))) {
    fail("initialBalanceYuan must be number");
  }
  const store = readStore();
  const now = new Date();
  const nowIso = now.toISOString();
  const contributionTick = computeBalanceTick({
    initialBalanceYuan: 0,
    events: store.events,
    now
  });
  const contribution = Number(contributionTick.displayBalanceYuan ?? 0);
  if (Math.abs(contribution) >= 0.0001) {
    store.events.push({
      id: store.nextEventId++,
      title: "初始化对齐",
      eventKind: "one_time",
      direction: contribution >= 0 ? "outflow" : "inflow",
      amountYuan: Math.abs(contribution),
      effectiveAt: nowIso,
      recurrenceUnit: null,
      recurrenceInterval: null,
      dailyStartTime: null,
      dailyEndTime: null,
      activeWeekdays: null,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }
  store.snapshot = {
    initialBalanceYuan,
    currentBalanceYuan: initialBalanceYuan,
    timezone: "Asia/Shanghai",
    updatedAt: nowIso
  };
  writeStore(store);
  return recomputeSnapshot(store, now);
}

export async function listEvents(status) {
  const store = readStore();
  const filtered = status ? store.events.filter((event) => event.status === status) : store.events;
  return [...filtered].sort((a, b) => {
    const t = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (t !== 0) return t;
    return b.id - a.id;
  });
}

export async function createEvent(payload) {
  validateCreatePayload(payload);
  const store = readStore();
  const now = new Date().toISOString();
  const recurringFields = normalizeRecurringFields(payload);
  const event = {
    id: store.nextEventId++,
    title: String(payload.title ?? "").trim() || "未命名事件",
    eventKind: payload.eventKind,
    direction: payload.direction,
    amountYuan: payload.amountYuan,
    effectiveAt: payload.effectiveAt,
    recurrenceUnit: recurringFields.recurrenceUnit,
    recurrenceInterval: recurringFields.recurrenceInterval,
    dailyStartTime: recurringFields.dailyStartTime,
    dailyEndTime: recurringFields.dailyEndTime,
    activeWeekdays: recurringFields.activeWeekdays,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  store.events.push(event);
  writeStore(store);
  recomputeSnapshot(store, new Date());
  return event;
}

export async function createQuickOneTimeEvent({ amountYuan, direction, title = "小组件快速记账" }) {
  return createEvent({
    title,
    eventKind: "one_time",
    direction,
    amountYuan,
    effectiveAt: new Date().toISOString()
  });
}

export async function patchEvent(id, patchPayload) {
  const store = readStore();
  const index = store.events.findIndex((event) => event.id === Number(id));
  if (index < 0) fail("event not found");

  const prev = store.events[index];
  const now = new Date();
  const nowIso = now.toISOString();
  let nextPatch = { ...patchPayload };
  let settlementEvent = null;

  if (prev.eventKind === "recurring" && prev.status === "active") {
    const recurringChanged = hasRecurringFinancialChange(prev, nextPatch);
    const nextStatus = nextPatch.status ?? prev.status;
    const turningInactive = nextStatus !== "active";
    if (recurringChanged || turningInactive) {
      const accrued = computeEventContribution(prev, now);
      settlementEvent = buildSettlementEvent(prev, accrued, nowIso, store.nextEventId);
      if (settlementEvent) {
        store.nextEventId += 1;
      }
    }
    if (
      recurringChanged &&
      (!Object.hasOwn(nextPatch, "effectiveAt") || String(nextPatch.effectiveAt) === String(prev.effectiveAt))
    ) {
      nextPatch.effectiveAt = nowIso;
    }
  }

  const merged = { ...prev, ...nextPatch };
  const validationPayload = {
    title: merged.title,
    eventKind: merged.eventKind,
    direction: merged.direction,
    amountYuan: merged.amountYuan,
    effectiveAt: merged.effectiveAt,
    recurrenceUnit: merged.recurrenceUnit,
    recurrenceInterval: merged.recurrenceInterval,
    dailyStartTime: merged.dailyStartTime,
    dailyEndTime: merged.dailyEndTime
  };
  if (merged.eventKind === "recurring") {
    validationPayload.activeWeekdays = merged.activeWeekdays;
  }
  validateCreatePayload(validationPayload);
  if (nextPatch.status && !["active", "paused", "deleted"].includes(nextPatch.status)) {
    fail("status must be active/paused/deleted");
  }

  store.events[index] = {
    ...merged,
    updatedAt: nowIso
  };
  if (settlementEvent) {
    store.events.push(settlementEvent);
  }
  writeStore(store);
  recomputeSnapshot(store, now);
  return store.events[index];
}

export async function deleteEvent(id) {
  const store = readStore();
  const nextEvents = store.events.filter((event) => event.id !== Number(id));
  if (nextEvents.length === store.events.length) {
    fail("event not found");
  }
  store.events = nextEvents;
  writeStore(store);
  recomputeSnapshot(store, new Date());
  return { id: Number(id), deleted: true };
}

export async function getRealtimeBalance() {
  const store = readStore();
  const snapshot = ensureSnapshot(store);
  return computeBalanceTick({
    initialBalanceYuan: snapshot.initialBalanceYuan,
    events: store.events,
    now: new Date()
  });
}

export async function getSavingsGoalSettings() {
  const store = readStore();
  return {
    savingsGoalTargetYuan: normalizeGoalValue(store.settings?.savingsGoalTargetYuan),
    updatedAt: store.settings?.updatedAt ?? null
  };
}

export async function putSavingsGoalSettings(savingsGoalTargetYuan) {
  const normalized = normalizeGoalValue(savingsGoalTargetYuan);
  if (normalized == null) {
    fail("savingsGoalTargetYuan must be > 0");
  }
  const store = readStore();
  store.settings = {
    savingsGoalTargetYuan: normalized,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  return { ...store.settings };
}

export async function clearAllLocalData() {
  const fresh = {
    snapshot: null,
    events: [],
    nextEventId: 1,
    settings: { ...DEFAULT_SETTINGS }
  };
  writeStore(fresh);
  memoryFallback.snapshot = null;
  memoryFallback.events = [];
  memoryFallback.nextEventId = 1;
  memoryFallback.settings = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
  return { cleared: true };
}
