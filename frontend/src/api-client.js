const STORAGE_KEY = "moneyflow.local.v2";
const DAY_SECONDS = 24 * 60 * 60;
const SECOND_MS = 1000;
const MONEY_PRECISION = 10000;
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

function overlapSeconds(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function activeSecondsBetween(startSec, endSec, dailyStartSec, dailyEndSec) {
  if (endSec <= startSec || dailyEndSec <= dailyStartSec) return 0;
  const startDay = Math.floor(startSec / DAY_SECONDS);
  const endDay = Math.floor((endSec - 1) / DAY_SECONDS);

  if (startDay === endDay) {
    return overlapSeconds(
      startSec,
      endSec,
      startDay * DAY_SECONDS + dailyStartSec,
      startDay * DAY_SECONDS + dailyEndSec
    );
  }

  const firstDayEnd = (startDay + 1) * DAY_SECONDS;
  const firstPartial = overlapSeconds(
    startSec,
    firstDayEnd,
    startDay * DAY_SECONDS + dailyStartSec,
    startDay * DAY_SECONDS + dailyEndSec
  );
  const lastDayStart = endDay * DAY_SECONDS;
  const lastPartial = overlapSeconds(
    lastDayStart,
    endSec,
    endDay * DAY_SECONDS + dailyStartSec,
    endDay * DAY_SECONDS + dailyEndSec
  );
  const fullDaysBetween = Math.max(0, endDay - startDay - 1);
  const middle = fullDaysBetween * (dailyEndSec - dailyStartSec);
  return firstPartial + middle + lastPartial;
}

function isInDailyWindow(nowSec, dailyStartSec, dailyEndSec) {
  const secOfDay = ((nowSec % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  return secOfDay >= dailyStartSec && secOfDay < dailyEndSec;
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
      const eventSec = toEpochSeconds(event.effectiveAt);
      if (eventSec <= nowSec) {
        total = roundMoney(total + event.amountYuan * eventSign(event.direction));
        oneTimeCount += 1;
      }
      continue;
    }

    if (event.eventKind === "recurring") {
      if (event.status !== "active") continue;
      const eventSec = toEpochSeconds(event.effectiveAt);
      if (eventSec > nowSec) continue;

      const { startSec, endSec, activeLengthSec } = getDailyWindow(event);
      const elapsedActive = activeSecondsBetween(eventSec, nowSec, startSec, endSec);
      const totalSeconds = periodSeconds(event.recurrenceUnit, event.recurrenceInterval);
      const periodDays = Math.max(1, Math.floor(totalSeconds / DAY_SECONDS));
      const activeSecondsPerPeriod = Math.max(1, periodDays * activeLengthSec);
      const delta = roundMoney((elapsedActive * event.amountYuan * eventSign(event.direction)) / activeSecondsPerPeriod);
      total = roundMoney(total + delta);
      if (isInDailyWindow(nowSec, startSec, endSec)) {
        recurringCount += 1;
        flowPerSecondYuan += (event.amountYuan * eventSign(event.direction)) / activeSecondsPerPeriod;
      }
    }
  }

  return {
    timestamp: new Date(nowSec * SECOND_MS).toISOString(),
    displayBalanceYuan: total,
    flowPerSecondYuan: roundMoney(flowPerSecondYuan),
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
  if (!payload.title || !String(payload.title).trim()) fail("title is required");
  if (!["one_time", "recurring"].includes(payload.eventKind)) fail("eventKind must be one_time/recurring");
  if (!["inflow", "outflow"].includes(payload.direction)) fail("direction must be inflow/outflow");
  if (!(typeof payload.amountYuan === "number" && Number.isFinite(payload.amountYuan) && payload.amountYuan >= 0.01)) {
    fail("amountYuan must be >= 0.01");
  }
  if (!payload.effectiveAt || Number.isNaN(Date.parse(payload.effectiveAt))) fail("effectiveAt must be ISO datetime");
  if (payload.eventKind === "one_time") return;

  if (!["day", "week", "month"].includes(payload.recurrenceUnit)) fail("recurrenceUnit must be day/week/month");
  if (!Number.isInteger(payload.recurrenceInterval) || payload.recurrenceInterval < 1) {
    fail("recurrenceInterval must be integer >= 1");
  }
  const start = payload.dailyStartTime ?? "00:01";
  const end = payload.dailyEndTime ?? "24:00";
  validateDailyWindow(start, end);
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
    dailyEndTime: payload.dailyEndTime ?? "24:00"
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
  store.events = store.events.filter((event) => event.eventKind !== "one_time");
  const now = new Date();
  store.snapshot = {
    initialBalanceYuan,
    currentBalanceYuan: initialBalanceYuan,
    timezone: "Asia/Shanghai",
    updatedAt: now.toISOString()
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
    title: String(payload.title).trim(),
    eventKind: payload.eventKind,
    direction: payload.direction,
    amountYuan: payload.amountYuan,
    effectiveAt: payload.effectiveAt,
    recurrenceUnit: recurringFields.recurrenceUnit,
    recurrenceInterval: recurringFields.recurrenceInterval,
    dailyStartTime: recurringFields.dailyStartTime,
    dailyEndTime: recurringFields.dailyEndTime,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  store.events.push(event);
  writeStore(store);
  recomputeSnapshot(store, new Date());
  return event;
}

export async function patchEvent(id, patchPayload) {
  const store = readStore();
  const index = store.events.findIndex((event) => event.id === Number(id));
  if (index < 0) fail("event not found");

  const prev = store.events[index];
  const merged = { ...prev, ...patchPayload };
  validateCreatePayload({
    title: merged.title,
    eventKind: merged.eventKind,
    direction: merged.direction,
    amountYuan: merged.amountYuan,
    effectiveAt: merged.effectiveAt,
    recurrenceUnit: merged.recurrenceUnit,
    recurrenceInterval: merged.recurrenceInterval,
    dailyStartTime: merged.dailyStartTime,
    dailyEndTime: merged.dailyEndTime
  });
  if (patchPayload.status && !["active", "paused", "deleted"].includes(patchPayload.status)) {
    fail("status must be active/paused/deleted");
  }

  store.events[index] = {
    ...merged,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  recomputeSnapshot(store, new Date());
  return store.events[index];
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
