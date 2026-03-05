export const DEFAULT_MONTHLY_INCOME_STAIR_THRESHOLDS = [
  3000, 6000, 10000, 15000, 22000, 30000, 42000, 60000, 85000, 120000, 180000, 260000, 380000
];

const WORK_DAYS_PER_WEEK = 5;
const HOURS_PER_WORK_DAY = 8;
const WEEKS_PER_MONTH = 30 / 7;
const WORK_DAYS_PER_MONTH = WORK_DAYS_PER_WEEK * WEEKS_PER_MONTH;
const WORK_HOURS_PER_MONTH = HOURS_PER_WORK_DAY * WORK_DAYS_PER_MONTH;
const WORK_MINUTES_PER_MONTH = 60 * WORK_HOURS_PER_MONTH;
const WORK_SECONDS_PER_MONTH = 60 * WORK_MINUTES_PER_MONTH;

function monthlyEquivalentFromUnitDelta(delta, unit) {
  const amount = Math.abs(Number(delta ?? 0));
  if (unit === "second") return amount * WORK_SECONDS_PER_MONTH;
  if (unit === "minute") return amount * WORK_MINUTES_PER_MONTH;
  if (unit === "hour") return amount * WORK_HOURS_PER_MONTH;
  if (unit === "day") return amount * WORK_DAYS_PER_MONTH;
  if (unit === "week") return amount * (30 / 7);
  if (unit === "month") return amount;
  if (unit === "year") return amount / 12;
  return amount * WORK_SECONDS_PER_MONTH;
}

export function resolveStairActiveSteps({
  unitDelta,
  jumpUnit,
  stepCount,
  thresholds = DEFAULT_MONTHLY_INCOME_STAIR_THRESHOLDS
}) {
  const monthlyEquivalent = monthlyEquivalentFromUnitDelta(unitDelta, jumpUnit);
  let activeSteps = stepCount;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (monthlyEquivalent < thresholds[i]) {
      activeSteps = i + 1;
      break;
    }
  }
  return Math.max(1, Math.min(stepCount, activeSteps));
}

export function resolveStairTierFromActiveSteps(activeSteps, stepCount) {
  const safeStepCount = Math.max(1, Number(stepCount) || 1);
  const safeActiveSteps = Math.min(safeStepCount, Math.max(1, Number(activeSteps) || 1));
  const stairRatio = safeActiveSteps / safeStepCount;
  if (stairRatio >= 0.93) return "diamond";
  if (stairRatio >= 0.78) return "platinum";
  if (stairRatio >= 0.62) return "gold";
  if (stairRatio >= 0.46) return "silver";
  if (stairRatio >= 0.3) return "bronze";
  return "base";
}
