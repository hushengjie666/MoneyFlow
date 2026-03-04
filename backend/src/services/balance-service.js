const SECOND_MS = 1000;
const DAY_SECONDS = 24 * 60 * 60;
const MONEY_PRECISION = 10000;
const ASIA_SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;
const DEFAULT_DAILY_START = "00:01";
const DEFAULT_DAILY_END = "24:00";

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

function getDailyWindow(event) {
  const startSec =
    parseDailyTimeToSeconds(event.dailyStartTime ?? DEFAULT_DAILY_START, { allow24: false }) ?? 60;
  const endSec =
    parseDailyTimeToSeconds(event.dailyEndTime ?? DEFAULT_DAILY_END, { allow24: true }) ?? DAY_SECONDS;
  if (endSec <= startSec) {
    return { startSec: 60, endSec: DAY_SECONDS, activeLengthSec: DAY_SECONDS - 60 };
  }
  return { startSec, endSec, activeLengthSec: endSec - startSec };
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

  const secondsPerPeriod = computeActiveSecondsPerPeriod(event, dailyStartSec, dailyEndSec, weekdaySet);
  const prorated = (elapsedActive * event.amountYuan) / secondsPerPeriod;
  return roundMoney(prorated * eventSign(event.direction));
}

function recurringFlowPerSecond(event, nowSec) {
  if (event.status !== "active") return 0;
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;

  const { startSec: dailyStartSec, endSec: dailyEndSec } = getDailyWindow(event);
  const weekdaySet = parseActiveWeekdays(event);
  if (!isInDailyWindow(nowSec, dailyStartSec, dailyEndSec, weekdaySet)) return 0;

  const secondsPerPeriod = computeActiveSecondsPerPeriod(event, dailyStartSec, dailyEndSec, weekdaySet);
  return (event.amountYuan * eventSign(event.direction)) / secondsPerPeriod;
}

export function computeEventContribution(event, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / SECOND_MS);
  if (event.eventKind === "one_time") {
    return oneTimeContribution(event, nowSec);
  }
  if (event.eventKind === "recurring") {
    return recurringContribution(event, nowSec);
  }
  return 0;
}

export function computeBalanceTick({ initialBalanceYuan, events, now = new Date() }) {
  const nowSec = Math.floor(now.getTime() / SECOND_MS);

  let oneTimeCount = 0;
  let recurringCount = 0;
  let flowPerSecondYuan = 0;
  let total = Number(initialBalanceYuan);

  for (const event of events) {
    if (event.status === "deleted") continue;
    if (event.eventKind === "one_time") {
      const delta = oneTimeContribution(event, nowSec);
      if (delta !== 0 || toEpochSeconds(event.effectiveAt) <= nowSec) oneTimeCount += 1;
      total = roundMoney(total + delta);
    } else if (event.eventKind === "recurring") {
      const delta = recurringContribution(event, nowSec);
      const flow = recurringFlowPerSecond(event, nowSec);
      const { startSec: dailyStartSec, endSec: dailyEndSec } = getDailyWindow(event);
      const weekdaySet = parseActiveWeekdays(event);
      if (
        event.status === "active" &&
        toEpochSeconds(event.effectiveAt) <= nowSec &&
        isInDailyWindow(nowSec, dailyStartSec, dailyEndSec, weekdaySet)
      ) {
        recurringCount += 1;
      }
      flowPerSecondYuan += flow;
      total = roundMoney(total + delta);
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
