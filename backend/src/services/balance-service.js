const SECOND_MS = 1000;
const DAY_SECONDS = 24 * 60 * 60;
const MONEY_PRECISION = 10000;
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

function oneTimeContribution(event, nowSec) {
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;
  return roundMoney(event.amountYuan * eventSign(event.direction));
}

function recurringContribution(event, nowSec) {
  if (event.status !== "active") return 0;
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;

  const { startSec: dailyStartSec, endSec: dailyEndSec, activeLengthSec } = getDailyWindow(event);
  const elapsedActive = activeSecondsBetween(eventSec, nowSec, dailyStartSec, dailyEndSec);
  if (elapsedActive <= 0) return 0;

  const totalSeconds = periodSeconds(event.recurrenceUnit, event.recurrenceInterval);
  const periodDays = Math.max(1, Math.floor(totalSeconds / DAY_SECONDS));
  const activeSecondsPerPeriod = Math.max(1, periodDays * activeLengthSec);
  const prorated = (elapsedActive * event.amountYuan) / activeSecondsPerPeriod;
  return roundMoney(prorated * eventSign(event.direction));
}

function recurringFlowPerSecond(event, nowSec) {
  if (event.status !== "active") return 0;
  const eventSec = toEpochSeconds(event.effectiveAt);
  if (eventSec > nowSec) return 0;

  const { startSec: dailyStartSec, endSec: dailyEndSec, activeLengthSec } = getDailyWindow(event);
  if (!isInDailyWindow(nowSec, dailyStartSec, dailyEndSec)) return 0;

  const totalSeconds = periodSeconds(event.recurrenceUnit, event.recurrenceInterval);
  const periodDays = Math.max(1, Math.floor(totalSeconds / DAY_SECONDS));
  const activeSecondsPerPeriod = Math.max(1, periodDays * activeLengthSec);
  return (event.amountYuan * eventSign(event.direction)) / activeSecondsPerPeriod;
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
      if (
        event.status === "active" &&
        toEpochSeconds(event.effectiveAt) <= nowSec &&
        isInDailyWindow(nowSec, dailyStartSec, dailyEndSec)
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
