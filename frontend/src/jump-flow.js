const DAY_SECONDS = 24 * 60 * 60;
const ASIA_SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;

function periodSeconds(unit, interval) {
  if (unit === "day") return DAY_SECONDS * interval;
  if (unit === "week") return DAY_SECONDS * 7 * interval;
  if (unit === "month") return DAY_SECONDS * 30 * interval;
  return DAY_SECONDS;
}

function eventSign(direction) {
  return direction === "inflow" ? 1 : -1;
}

function isLongRangeJumpUnit(jumpUnit) {
  return jumpUnit === "week" || jumpUnit === "month" || jumpUnit === "year";
}

function toEpochSeconds(isoText) {
  return Math.floor(new Date(isoText).getTime() / 1000);
}

function parseActiveWeekdays(event) {
  const source = event.activeWeekdays ?? [1, 2, 3, 4, 5, 6, 7];
  const list = Array.isArray(source)
    ? source
    : String(source)
      .split(",")
      .map((item) => Number(item.trim()));
  const valid = list.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  return new Set(valid.length ? valid : [1, 2, 3, 4, 5, 6, 7]);
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

function getDailyActiveSeconds(event) {
  const startSec = parseDailyTimeToSeconds(event?.dailyStartTime ?? "00:01", { allow24: false }) ?? 60;
  const endSec = parseDailyTimeToSeconds(event?.dailyEndTime ?? "24:00", { allow24: true }) ?? DAY_SECONDS;
  if (endSec <= startSec) return DAY_SECONDS - 60;
  return Math.max(60, endSec - startSec);
}

function toLocalDayAlignedSeconds(epochSeconds) {
  return epochSeconds + ASIA_SHANGHAI_OFFSET_SECONDS;
}

function isoWeekdayFromDayIndex(dayIndex) {
  return ((dayIndex + 3) % 7 + 7) % 7 + 1;
}

function computeActiveSecondsPerPeriodIgnoringDailyWindow(event, weekdaySet) {
  const totalSeconds = periodSeconds(event.recurrenceUnit, event.recurrenceInterval);
  const weekdayRatio = Math.max(1 / 7, Math.min(1, weekdaySet.size / 7));
  return totalSeconds * weekdayRatio;
}

function computeWorkdayUnitDelta(events, jumpUnit, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000);
  const nowLocalSec = toLocalDayAlignedSeconds(nowSec);
  const nowDayIndex = Math.floor(nowLocalSec / DAY_SECONDS);
  const nowIsoWeekday = isoWeekdayFromDayIndex(nowDayIndex);
  const nowSecondInDay = ((nowLocalSec % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  const list = Array.isArray(events) ? events : [];
  let delta = 0;
  let matchedRecurringCount = 0;

  for (const event of list) {
    if (event?.eventKind !== "recurring") continue;
    if (event?.status !== "active") continue;
    const effectiveSec = toEpochSeconds(String(event?.effectiveAt ?? ""));
    if (!Number.isFinite(effectiveSec) || effectiveSec > nowSec) continue;

    const recurrenceInterval = Number(event?.recurrenceInterval ?? 1);
    const amountYuan = Number(event?.amountYuan ?? 0);
    if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1) continue;
    if (!Number.isFinite(amountYuan) || amountYuan <= 0) continue;
    matchedRecurringCount += 1;

    const weekdaySet = parseActiveWeekdays(event);
    if (!weekdaySet.has(nowIsoWeekday)) continue;

    const activeDaysPerPeriod = computeActiveSecondsPerPeriodIgnoringDailyWindow(event, weekdaySet) / DAY_SECONDS;
    const activeHoursPerDay = getDailyActiveSeconds(event) / 3600;
    if (!(activeDaysPerPeriod > 0 && activeHoursPerDay > 0)) continue;

    if (jumpUnit === "second" || jumpUnit === "minute" || jumpUnit === "hour") {
      const startSec =
        parseDailyTimeToSeconds(event?.dailyStartTime ?? "00:01", { allow24: false }) ?? 60;
      const endSec =
        parseDailyTimeToSeconds(event?.dailyEndTime ?? "24:00", { allow24: true }) ?? DAY_SECONDS;
      if (!(nowSecondInDay >= startSec && nowSecondInDay < endSec)) {
        continue;
      }
    }

    let unitValue = 0;
    if (jumpUnit === "day") {
      unitValue = amountYuan / activeDaysPerPeriod;
    } else if (jumpUnit === "hour") {
      unitValue = amountYuan / (activeDaysPerPeriod * activeHoursPerDay);
    } else if (jumpUnit === "minute") {
      unitValue = amountYuan / (activeDaysPerPeriod * activeHoursPerDay * 60);
    } else {
      unitValue = amountYuan / (activeDaysPerPeriod * activeHoursPerDay * 3600);
    }
    delta += unitValue * eventSign(event?.direction);
  }
  if (matchedRecurringCount === 0) return null;
  return delta;
}

export function computeNominalRecurringFlowPerSecond(events, now = new Date()) {
  const nowMs = now.getTime();
  const list = Array.isArray(events) ? events : [];
  let flowPerSecond = 0;

  for (const event of list) {
    if (event?.eventKind !== "recurring") continue;
    if (event?.status !== "active") continue;
    const effectiveMs = Date.parse(String(event?.effectiveAt ?? ""));
    if (!Number.isFinite(effectiveMs) || effectiveMs > nowMs) continue;

    const recurrenceUnit = String(event?.recurrenceUnit ?? "day");
    const recurrenceInterval = Number(event?.recurrenceInterval ?? 1);
    const amountYuan = Number(event?.amountYuan ?? 0);
    if (!Number.isFinite(amountYuan) || amountYuan <= 0) continue;
    if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1) continue;

    const secondsPerPeriod = periodSeconds(recurrenceUnit, recurrenceInterval);
    flowPerSecond += (amountYuan * eventSign(event?.direction)) / secondsPerPeriod;
  }

  return flowPerSecond;
}

export function computeDayJumpFlowPerSecondIgnoringDailyWindow(events, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000);
  const nowLocalSec = toLocalDayAlignedSeconds(nowSec);
  const nowDayIndex = Math.floor(nowLocalSec / DAY_SECONDS);
  const nowIsoWeekday = isoWeekdayFromDayIndex(nowDayIndex);
  const list = Array.isArray(events) ? events : [];
  let flowPerSecond = 0;

  for (const event of list) {
    if (event?.eventKind !== "recurring") continue;
    if (event?.status !== "active") continue;
    const effectiveSec = toEpochSeconds(String(event?.effectiveAt ?? ""));
    if (!Number.isFinite(effectiveSec) || effectiveSec > nowSec) continue;
    const weekdaySet = parseActiveWeekdays(event);
    if (!weekdaySet.has(nowIsoWeekday)) continue;

    const recurrenceInterval = Number(event?.recurrenceInterval ?? 1);
    const amountYuan = Number(event?.amountYuan ?? 0);
    if (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1) continue;
    if (!Number.isFinite(amountYuan) || amountYuan <= 0) continue;

    const secondsPerPeriod = computeActiveSecondsPerPeriodIgnoringDailyWindow(event, weekdaySet);
    flowPerSecond += (amountYuan * eventSign(event?.direction)) / secondsPerPeriod;
  }

  return flowPerSecond;
}

export function resolveJumpDisplayFlowPerSecond({
  jumpUnit,
  realtimeFlowPerSecondYuan,
  events,
  now = new Date()
}) {
  const realtime = Number(realtimeFlowPerSecondYuan ?? 0);
  if (jumpUnit === "second" || jumpUnit === "minute" || jumpUnit === "hour") {
    const secondDelta = computeWorkdayUnitDelta(events, "second", now);
    if (secondDelta != null && Number.isFinite(secondDelta)) return secondDelta;
    return realtime;
  }
  if (jumpUnit === "day") {
    return computeDayJumpFlowPerSecondIgnoringDailyWindow(events, now);
  }
  if (!isLongRangeJumpUnit(jumpUnit)) return realtime;
  return computeNominalRecurringFlowPerSecond(events, now);
}

export function resolveJumpDisplayDeltaByUnit({
  jumpUnit,
  realtimeFlowPerSecondYuan,
  events,
  now = new Date()
}) {
  const realtime = Number(realtimeFlowPerSecondYuan ?? 0);
  if (jumpUnit === "second" || jumpUnit === "minute" || jumpUnit === "hour" || jumpUnit === "day") {
    const fromWorkday = computeWorkdayUnitDelta(events, jumpUnit, now);
    if (fromWorkday != null && Number.isFinite(fromWorkday)) return fromWorkday;
    const fallbackMultiplier = jumpUnit === "day" ? DAY_SECONDS : jumpUnit === "hour" ? 3600 : jumpUnit === "minute" ? 60 : 1;
    return realtime * fallbackMultiplier;
  }

  const nominalPerSecond = computeNominalRecurringFlowPerSecond(events, now);
  if (jumpUnit === "week") return nominalPerSecond * 604800;
  if (jumpUnit === "month") return nominalPerSecond * 2592000;
  if (jumpUnit === "year") return nominalPerSecond * 31104000;
  return realtime;
}
