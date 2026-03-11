const DAY_SECONDS = 24 * 60 * 60;
const ASIA_SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;

function parseDailyTimeToSeconds(value, allow24 = false) {
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

function toEpochSeconds(value) {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  return Math.floor(new Date(value).getTime() / 1000);
}

function toLocalAlignedSeconds(epochSeconds) {
  return epochSeconds + ASIA_SHANGHAI_OFFSET_SECONDS;
}

function toDayParts(localAlignedSeconds) {
  return {
    dayIndex: Math.floor(localAlignedSeconds / DAY_SECONDS),
    secOfDay: ((localAlignedSeconds % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS
  };
}

function periodDays(unit, interval) {
  if (unit === "week") return 7 * interval;
  if (unit === "month") return 30 * interval;
  return interval;
}

function isoWeekdayFromDayIndex(dayIndex) {
  return ((dayIndex + 3) % 7 + 7) % 7 + 1;
}

function countActiveDaysInPeriod(startDayIndex, periodDaysCount, weekdaySet) {
  let activeDayCount = 0;
  for (let offset = 0; offset < periodDaysCount; offset += 1) {
    if (weekdaySet.has(isoWeekdayFromDayIndex(startDayIndex + offset))) {
      activeDayCount += 1;
    }
  }
  return activeDayCount;
}

function normalizeRecurringEventFlow(event) {
  if (event.eventKind !== "recurring" || event.status !== "active") return null;
  const amount = Number(event.amountYuan);
  const effectiveEpoch = toEpochSeconds(event.effectiveAt);
  const recurrenceEndEpoch = event.recurrenceEndAt ? toEpochSeconds(event.recurrenceEndAt) : null;
  if (!Number.isFinite(amount) || !Number.isFinite(effectiveEpoch)) return null;
  if (recurrenceEndEpoch != null && (!Number.isFinite(recurrenceEndEpoch) || recurrenceEndEpoch <= effectiveEpoch)) {
    return null;
  }
  const startSec = parseDailyTimeToSeconds(event.dailyStartTime ?? "00:01", false) ?? 60;
  const endSec = parseDailyTimeToSeconds(event.dailyEndTime ?? "24:00", true) ?? DAY_SECONDS;
  if (endSec <= startSec) return null;
  const weekdays = Array.isArray(event.activeWeekdays) && event.activeWeekdays.length
    ? event.activeWeekdays
    : [1, 2, 3, 4, 5, 6, 7];
  const weekdaySet = new Set(
    weekdays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  );
  if (!weekdaySet.size) return null;
  const interval = Math.max(1, Number(event.recurrenceInterval ?? 1));
  const unitDays = Math.max(1, periodDays(event.recurrenceUnit, interval));
  const eventStartDay = Math.floor(toLocalAlignedSeconds(effectiveEpoch) / DAY_SECONDS);
  const activeDayCount = Math.max(1, countActiveDaysInPeriod(eventStartDay, unitDays, weekdaySet));
  const activeSecondsPerPeriod = activeDayCount * (endSec - startSec);
  const sign = event.direction === "inflow" ? 1 : -1;
  return {
    effectiveEpoch,
    recurrenceEndEpoch,
    startSec,
    endSec,
    weekdaySet,
    ratePerSecond: (amount * sign) / activeSecondsPerPeriod
  };
}

export function estimateGoalEtaBySchedule(currentBalanceYuan, targetBalanceYuan, events, now = new Date()) {
  const target = Number(targetBalanceYuan);
  const current = Number(currentBalanceYuan);
  if (!(target > current)) return 0;

  const recurringFlows = events.map(normalizeRecurringEventFlow).filter(Boolean);
  if (!recurringFlows.length) return null;

  const nowEpoch = toEpochSeconds(now);
  const localNow = toLocalAlignedSeconds(nowEpoch);
  const { dayIndex: startDayIndex, secOfDay: startSecOfDay } = toDayParts(localNow);
  const maxSimulateDays = 365;

  let balance = current;
  let elapsedSeconds = 0;

  for (let dayOffset = 0; dayOffset < maxSimulateDays; dayOffset += 1) {
    const dayIndex = startDayIndex + dayOffset;
    const dayStartLocal = dayIndex * DAY_SECONDS;
    const dayStartEpoch = dayStartLocal - ASIA_SHANGHAI_OFFSET_SECONDS;
    const dayEndEpoch = dayStartEpoch + DAY_SECONDS;
    const segmentStartSec = dayOffset === 0 ? startSecOfDay : 0;
    const breakpoints = new Set([segmentStartSec, DAY_SECONDS]);

    for (const flow of recurringFlows) {
      if (flow.endSec > segmentStartSec) breakpoints.add(Math.max(segmentStartSec, flow.startSec));
      if (flow.endSec > segmentStartSec) breakpoints.add(flow.endSec);
      if (flow.effectiveEpoch >= dayStartEpoch && flow.effectiveEpoch < dayEndEpoch) {
        const localEffective = toLocalAlignedSeconds(flow.effectiveEpoch);
        const { secOfDay } = toDayParts(localEffective);
        if (secOfDay >= segmentStartSec) breakpoints.add(secOfDay);
      }
    }

    const sorted = [...breakpoints].filter((sec) => sec >= segmentStartSec && sec <= DAY_SECONDS).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const segStart = sorted[i];
      const segEnd = sorted[i + 1];
      if (segEnd <= segStart) continue;
      const segMid = segStart + (segEnd - segStart) / 2;
      const segMidEpoch = dayStartEpoch + segMid;
      let netRate = 0;

      for (const flow of recurringFlows) {
        if (flow.effectiveEpoch > segMidEpoch) continue;
        if (flow.recurrenceEndEpoch != null && segMidEpoch >= flow.recurrenceEndEpoch) continue;
        if (segMid < flow.startSec || segMid >= flow.endSec) continue;
        const weekday = isoWeekdayFromDayIndex(dayIndex);
        if (!flow.weekdaySet.has(weekday)) continue;
        netRate += flow.ratePerSecond;
      }

      const duration = segEnd - segStart;
      const delta = netRate * duration;
      if (netRate > 0 && balance + delta >= target) {
        const secondsToGoal = (target - balance) / netRate;
        return elapsedSeconds + Math.max(0, secondsToGoal);
      }

      balance += delta;
      elapsedSeconds += duration;
    }
  }

  const avgNet = (balance - current) / Math.max(1, elapsedSeconds);
  if (avgNet > 0) {
    return elapsedSeconds + (target - balance) / avgNet;
  }
  return null;
}
