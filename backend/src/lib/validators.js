const MAX_EVENT_AMOUNT_YUAN = 1000000000;
const MAX_SNAPSHOT_ABS_YUAN = 1000000000;
const FORBIDDEN_IDENTITY_FIELDS = ["userId", "accountId"];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasAtMostTwoDecimals(value) {
  return Math.round(value * 100) === value * 100;
}

function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}

function hasForbiddenIdentityField(payload) {
  return FORBIDDEN_IDENTITY_FIELDS.some((field) => Object.hasOwn(payload, field));
}

export function assertNoForbiddenIdentityFields(payload) {
  if (hasForbiddenIdentityField(payload)) {
    return "single-user model does not accept userId/accountId";
  }
  return null;
}

function validateMoneyYuan(value, label, { min, max, allowNegative = false }) {
  if (!isFiniteNumber(value)) return `${label} must be number`;
  if (!hasAtMostTwoDecimals(value)) return `${label} must have at most 2 decimal places`;
  if (!allowNegative && value < min) return `${label} must be >= ${min}`;
  if (allowNegative && (value < min || value > max)) {
    return `${label} must be within ${min}..${max}`;
  }
  if (!allowNegative && value > max) return `${label} must be <= ${max}`;
  return null;
}

export function validateSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "payload must be object";
  }
  const forbiddenFieldError = assertNoForbiddenIdentityFields(payload);
  if (forbiddenFieldError) return forbiddenFieldError;
  if (!Object.hasOwn(payload, "initialBalanceYuan")) {
    return "initialBalanceYuan is required";
  }
  return validateMoneyYuan(payload.initialBalanceYuan, "initialBalanceYuan", {
    min: -MAX_SNAPSHOT_ABS_YUAN,
    max: MAX_SNAPSHOT_ABS_YUAN,
    allowNegative: true
  });
}

function validateRecurringFields(payload) {
  if (![
    "day",
    "week",
    "month"
  ].includes(payload.recurrenceUnit)) {
    return "recurrenceUnit must be one of day/week/month";
  }
  if (!isInteger(payload.recurrenceInterval) || payload.recurrenceInterval < 1) {
    return "recurrenceInterval must be integer >= 1";
  }
  const dailyStartTime = payload.dailyStartTime ?? "00:01";
  const dailyEndTime = payload.dailyEndTime ?? "24:00";
  const startSec = parseDailyTimeToSeconds(dailyStartTime, false);
  const endSec = parseDailyTimeToSeconds(dailyEndTime, true);
  if (startSec == null) {
    return "dailyStartTime must be HH:mm in 00:01..23:59";
  }
  if (endSec == null) {
    return "dailyEndTime must be HH:mm in 00:01..24:00";
  }
  if (startSec <= 0) {
    return "dailyStartTime must be later than 00:00";
  }
  if (startSec >= endSec) {
    return "dailyStartTime must be earlier than dailyEndTime";
  }
  const weekdays = payload.activeWeekdays ?? [1, 2, 3, 4, 5, 6, 7];
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return "activeWeekdays must contain at least one weekday";
  }
  const weekdaySet = new Set();
  for (const day of weekdays) {
    if (!isInteger(day) || day < 1 || day > 7) {
      return "activeWeekdays must use integers 1..7";
    }
    weekdaySet.add(day);
  }
  if (weekdaySet.size === 0) {
    return "activeWeekdays must contain at least one weekday";
  }
  return null;
}

function parseDailyTimeToSeconds(value, allow24) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  if (hour === 24 && minute === 0 && allow24) return 24 * 60 * 60;
  if (hour < 0 || hour > 23) return null;
  return hour * 60 * 60 + minute * 60;
}

function validateBaseEventFields(payload, forPatch = false) {
  const forbiddenFieldError = assertNoForbiddenIdentityFields(payload);
  if (forbiddenFieldError) return forbiddenFieldError;

  if (!forPatch || Object.hasOwn(payload, "title")) {
    if (payload.title != null && typeof payload.title !== "string") {
      return "title must be string";
    }
    if (typeof payload.title === "string" && payload.title.trim().length > 80) {
      return "title must be <= 80 chars";
    }
  }

  if (!forPatch || Object.hasOwn(payload, "amountYuan")) {
    const moneyError = validateMoneyYuan(payload.amountYuan, "amountYuan", {
      min: 0.01,
      max: MAX_EVENT_AMOUNT_YUAN,
      allowNegative: false
    });
    if (moneyError) return moneyError;
  }
  if (!forPatch || Object.hasOwn(payload, "effectiveAt")) {
    if (typeof payload.effectiveAt !== "string" || Number.isNaN(Date.parse(payload.effectiveAt))) {
      return "effectiveAt must be ISO datetime string";
    }
  }
  if (!forPatch || Object.hasOwn(payload, "direction")) {
    if (!["inflow", "outflow"].includes(payload.direction)) {
      return "direction must be inflow/outflow";
    }
  }
  return null;
}

function validateClientSource(payload, forPatch = false) {
  if (!Object.hasOwn(payload, "clientSource")) return null;
  if (forPatch) return "clientSource is immutable";
  if (!["app", "widget"].includes(payload.clientSource)) {
    return "clientSource must be app/widget";
  }
  if (payload.clientSource === "widget" && payload.eventKind !== "one_time") {
    return "widget clientSource only supports one_time events";
  }
  return null;
}

export function validateEventCreatePayload(payload) {
  if (!payload || typeof payload !== "object") return "payload must be object";
  const baseError = validateBaseEventFields(payload);
  if (baseError) return baseError;

  if (!["one_time", "recurring"].includes(payload.eventKind)) {
    return "eventKind must be one_time/recurring";
  }
  const sourceError = validateClientSource(payload, false);
  if (sourceError) return sourceError;
  if (payload.eventKind === "one_time") {
    if (
      payload.recurrenceUnit != null ||
      payload.recurrenceInterval != null ||
      payload.dailyStartTime != null ||
      payload.dailyEndTime != null ||
      payload.activeWeekdays != null
    ) {
      return "one_time event must not include recurrence or daily time-window fields";
    }
  }
  if (payload.eventKind === "recurring") {
    return validateRecurringFields(payload);
  }
  return null;
}

export function validateEventPatchPayload(payload) {
  if (!payload || typeof payload !== "object") return "payload must be object";
  if (Object.keys(payload).length === 0) return "patch payload must not be empty";
  const baseError = validateBaseEventFields(payload, true);
  if (baseError) return baseError;
  const sourceError = validateClientSource(payload, true);
  if (sourceError) return sourceError;

  if (Object.hasOwn(payload, "status") && !["active", "paused", "deleted"].includes(payload.status)) {
    return "status must be active/paused/deleted";
  }
  const recurrenceTouched =
    Object.hasOwn(payload, "recurrenceUnit") ||
    Object.hasOwn(payload, "recurrenceInterval") ||
    Object.hasOwn(payload, "dailyStartTime") ||
    Object.hasOwn(payload, "dailyEndTime") ||
    Object.hasOwn(payload, "activeWeekdays");
  if (recurrenceTouched) {
    const hasOnlyOneDailyTimeField =
      Object.hasOwn(payload, "dailyStartTime") !== Object.hasOwn(payload, "dailyEndTime");
    if (hasOnlyOneDailyTimeField) {
      return "dailyStartTime and dailyEndTime must be provided together in patch";
    }
    const recurrenceError = validateRecurringFields({
      recurrenceUnit: payload.recurrenceUnit,
      recurrenceInterval: payload.recurrenceInterval,
      dailyStartTime: payload.dailyStartTime,
      dailyEndTime: payload.dailyEndTime,
      activeWeekdays: payload.activeWeekdays
    });
    if (recurrenceError) return recurrenceError;
  }
  return null;
}

export const MONEY_LIMITS = {
  MAX_EVENT_AMOUNT_YUAN,
  MAX_SNAPSHOT_ABS_YUAN
};
