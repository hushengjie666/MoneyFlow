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
    if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
      return "title is required";
    }
    if (payload.title.trim().length > 80) {
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

export function validateEventCreatePayload(payload) {
  if (!payload || typeof payload !== "object") return "payload must be object";
  const baseError = validateBaseEventFields(payload);
  if (baseError) return baseError;

  if (!["one_time", "recurring"].includes(payload.eventKind)) {
    return "eventKind must be one_time/recurring";
  }
  if (payload.eventKind === "one_time") {
    if (
      payload.recurrenceUnit != null ||
      payload.recurrenceInterval != null ||
      payload.dailyStartTime != null ||
      payload.dailyEndTime != null
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

  if (Object.hasOwn(payload, "status") && !["active", "paused", "deleted"].includes(payload.status)) {
    return "status must be active/paused/deleted";
  }
  const recurrenceTouched =
    Object.hasOwn(payload, "recurrenceUnit") ||
    Object.hasOwn(payload, "recurrenceInterval") ||
    Object.hasOwn(payload, "dailyStartTime") ||
    Object.hasOwn(payload, "dailyEndTime");
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
      dailyEndTime: payload.dailyEndTime
    });
    if (recurrenceError) return recurrenceError;
  }
  return null;
}

export const MONEY_LIMITS = {
  MAX_EVENT_AMOUNT_YUAN,
  MAX_SNAPSHOT_ABS_YUAN
};
