export function formatYuan(yuan) {
  const amount = Number(yuan ?? 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatYuanPrecise(yuan, fractionDigits = 4) {
  const amount = Number(yuan ?? 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount);
}

export function formatYuanDynamic(yuan, maxFractionDigits = 2) {
  const amount = Number(yuan ?? 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits
  }).format(amount);
}

export function formatSignedYuan(yuan) {
  const amount = Number(yuan ?? 0);
  if (amount > 0) return `+${formatYuan(amount)}`;
  if (amount < 0) return `-${formatYuan(Math.abs(amount))}`;
  return formatYuan(0);
}

export const JUMP_UNIT_LABEL = {
  second: "每秒",
  minute: "每分",
  hour: "每时",
  day: "每天",
  week: "每周",
  month: "每月",
  year: "每年"
};

export function jumpUnitLabel(unit) {
  return JUMP_UNIT_LABEL[unit] ?? "每秒";
}

export function formatJumpByUnit(yuanDelta, unit) {
  const amount = Number(yuanDelta ?? 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const unitSuffix = jumpUnitLabel(unit).replace("每", "");
  const absAmount = Math.abs(amount);
  let fractionDigits = 3;
  if (absAmount >= 100) {
    fractionDigits = 0;
  } else if (absAmount >= 10) {
    fractionDigits = 1;
  } else if (absAmount >= 1) {
    fractionDigits = 2;
  }
  const compactAmount = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(absAmount);
  return `${sign}${compactAmount} 元/${unitSuffix}`;
}

export function formatEventSummary(event) {
  const sign = event.direction === "inflow" ? "+" : "-";
  const timeLabel =
    event.eventKind === "recurring"
      ? `${event.recurrenceInterval}${event.recurrenceUnit} ${event.dailyStartTime ?? "00:00"}-${event.dailyEndTime ?? "24:00"}`
      : "一次";
  const title = event.title?.trim() ? event.title.trim() : "未命名事件";
  return `${title} · ${sign}${formatYuan(event.amountYuan)} · ${event.eventKind} · ${timeLabel} · ${event.status}`;
}

export function formatEtaDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds ?? 0)));
  const day = Math.floor(seconds / 86400);
  const hour = Math.floor((seconds % 86400) / 3600);
  const minute = Math.floor((seconds % 3600) / 60);

  if (day > 0) return `${day}天 ${hour}小时`;
  if (hour > 0) return `${hour}小时 ${minute}分钟`;
  return `${Math.max(1, minute)}分钟`;
}
