import {
  clearAllLocalData,
  createEvent,
  deleteEvent,
  getRealtimeBalance,
  getSavingsGoalSettings,
  getSnapshot,
  listEvents,
  patchEvent,
  putSavingsGoalSettings,
  putSnapshot
} from "./api-client.js";
import { startBalancePolling } from "./balance-engine.js";
import { filterRecentEvents } from "./event-visibility.js";
import { formatEtaDuration, formatJumpByUnit, formatYuan, jumpUnitLabel } from "./formatters.js";
import { estimateGoalEtaBySchedule } from "./goal-eta.js";
import { buildJumpPalette } from "./jump-palette.js";

const statusText = document.getElementById("statusText");
const jumpTitle = document.getElementById("jumpTitle");
const snapshotForm = document.getElementById("snapshotForm");
const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const jumpUnitSelect = document.getElementById("jumpUnit");
const recurringFields = document.getElementById("recurringFields");
const eventKindSelect = document.getElementById("eventKind");
const directionSelect = document.getElementById("direction");
const titleInput = document.getElementById("title");
const dailyStartTimeInput = document.getElementById("dailyStartTime");
const dailyEndTimeInput = document.getElementById("dailyEndTime");
const weekdayInputs = Array.from(document.querySelectorAll('input[name="activeWeekdays"]'));
const effectiveAtInput = document.getElementById("effectiveAt");
const eventSubmitBtn = document.getElementById("eventSubmitBtn");
const eventModalTitle = document.getElementById("eventModalTitle");
const jumpCurrent = document.getElementById("jumpCurrent");
const jumpDelta = document.getElementById("jumpDelta");
const jumpStair = document.getElementById("jumpStair");
const jumpTimestamp = document.getElementById("jumpTimestamp");
const eventModal = document.getElementById("eventModal");
const openEventModalBtn = document.getElementById("openEventModalBtn");
const closeEventModalBtn = document.getElementById("closeEventModalBtn");
const goalForm = document.getElementById("goalForm");
const goalTargetBalanceInput = document.getElementById("goalTargetBalanceYuan");
const goalPanel = document.querySelector(".goal-panel");
const goalBadge = document.getElementById("goalBadge");
const goalProgressFill = document.getElementById("goalProgressFill");
const goalProgressText = document.getElementById("goalProgressText");
const goalEtaText = document.getElementById("goalEtaText");
const menuButtons = Array.from(document.querySelectorAll(".menu-btn"));
const panelPages = Array.from(document.querySelectorAll(".panel-page"));
const clearLocalDataBtn = document.getElementById("clearLocalDataBtn");
const recentShowSystemGeneratedInput = document.getElementById("recentShowSystemGenerated");

const STAIR_STEP_COUNT = 14;
const JUMP_UNIT_STORAGE_KEY = "moneyflow.ui.jumpUnit";
const RECENT_SHOW_SYSTEM_EVENTS_STORAGE_KEY = "moneyflow.ui.recent.showSystemGenerated";
const JUMP_UNIT_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000,
  year: 31536000
};
const RECURRENCE_UNIT_LABEL = {
  day: "天",
  week: "周",
  month: "月"
};
const WEEKDAY_LABEL = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "日"
};

let lastTickBalance = null;
let clockTimer = null;
let statusTimer = null;
let currentJumpUnit = "second";
let currentGoalTarget = null;
let goalCompletionNotifiedFor = null;
let cachedEvents = [];
let showSystemGeneratedRecentEvents = false;
let editingEventId = null;
let editingEventKind = null;

function getSavedJumpUnit() {
  try {
    const stored = localStorage.getItem(JUMP_UNIT_STORAGE_KEY);
    if (stored && Object.hasOwn(JUMP_UNIT_SECONDS, stored)) return stored;
  } catch {
    // ignore local storage failures
  }
  return "second";
}

function saveJumpUnit(unit) {
  try {
    localStorage.setItem(JUMP_UNIT_STORAGE_KEY, unit);
  } catch {
    // ignore local storage failures
  }
}

function getSavedSystemEventVisibility() {
  try {
    return localStorage.getItem(RECENT_SHOW_SYSTEM_EVENTS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSystemEventVisibility(value) {
  try {
    localStorage.setItem(RECENT_SHOW_SYSTEM_EVENTS_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore local storage failures
  }
}

function applySystemEventVisibility(value) {
  showSystemGeneratedRecentEvents = Boolean(value);
  if (recentShowSystemGeneratedInput) {
    recentShowSystemGeneratedInput.checked = showSystemGeneratedRecentEvents;
  }
}

function applyJumpUnit(unit) {
  currentJumpUnit = Object.hasOwn(JUMP_UNIT_SECONDS, unit) ? unit : "second";
  if (jumpUnitSelect) jumpUnitSelect.value = currentJumpUnit;
  if (jumpTitle) jumpTitle.textContent = `资金数字跳动 · ${jumpUnitLabel(currentJumpUnit)}`;
}

function initJumpStair() {
  if (!jumpStair || jumpStair.childElementCount > 0) return;
  for (let i = 0; i < STAIR_STEP_COUNT; i += 1) {
    const step = document.createElement("span");
    step.className = "stair-step";
    step.style.setProperty("--step-index", String(i));
    jumpStair.appendChild(step);
  }
}

function renderJumpRhythm(delta, direction) {
  if (!jumpStair) return;
  const children = Array.from(jumpStair.children);
  const absDelta = Math.abs(delta);
  const tierThresholds = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  let activeSteps = STAIR_STEP_COUNT;
  for (let i = 0; i < tierThresholds.length; i += 1) {
    if (absDelta < tierThresholds[i]) {
      activeSteps = i + 1;
      break;
    }
  }
  jumpStair.dataset.direction = direction;
  jumpStair.dataset.level = String(activeSteps);
  const lux = activeSteps / STAIR_STEP_COUNT;
  jumpStair.style.setProperty("--lux", String(lux));
  const palette = buildJumpPalette({
    direction,
    activeSteps,
    totalSteps: STAIR_STEP_COUNT
  });
  jumpStair.style.setProperty("--stair-hue-from", String(palette.stairHueFrom));
  jumpStair.style.setProperty("--stair-hue-to", String(palette.stairHueTo));
  jumpDelta.style.setProperty("--delta-color-top", palette.deltaColorTop);
  jumpDelta.style.setProperty("--delta-color-mid", palette.deltaColorMid);
  jumpDelta.style.setProperty("--delta-color-accent", palette.deltaColorAccent);
  jumpDelta.style.setProperty("--delta-color-bottom", palette.deltaColorBottom);
  jumpDelta.style.setProperty("--delta-glow", palette.deltaGlow);
  jumpDelta.style.setProperty("--delta-outline", palette.deltaOutline);
  jumpDelta.style.setProperty("--delta-glint", palette.deltaGlint);

  children.forEach((node, index) => {
    node.classList.toggle("active", index < activeSteps);
  });
}

function setStatus(message, type = "info") {
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  if (!message) {
    statusText.textContent = "";
    statusText.classList.add("hidden");
    statusText.classList.remove("show");
    return;
  }
  statusText.classList.remove("hidden");
  statusText.classList.add("show");
  statusText.textContent = message;
  statusText.dataset.type = type;

  if (type === "success") {
    statusTimer = setTimeout(() => setStatus(""), 2200);
  } else if (type === "error") {
    statusTimer = setTimeout(() => setStatus(""), 4200);
  }
}

function openEventModal() {
  if (!editingEventId) {
    effectiveAtInput.value = toDateTimeLocalValue(new Date());
    eventModalTitle.textContent = "新增资金事件";
    eventSubmitBtn.textContent = "创建事件";
    eventKindSelect.disabled = false;
  }
  eventModal?.classList.remove("hidden");
}

function closeEventModal() {
  editingEventId = null;
  editingEventKind = null;
  eventModalTitle.textContent = "新增资金事件";
  eventSubmitBtn.textContent = "创建事件";
  eventKindSelect.disabled = false;
  eventModal?.classList.add("hidden");
}

function toDateTimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function switchPanel(targetId) {
  menuButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === targetId));
  panelPages.forEach((panel) => panel.classList.toggle("active", panel.id === targetId));
}

function formatRealtimeLabel(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`;
}

function startRealtimeClock() {
  const render = () => {
    const now = new Date();
    jumpTimestamp.textContent = `实时时间：${formatRealtimeLabel(now)}`;
  };
  render();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(render, 1000);
}

function normalizeDateTimeLocal(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("生效时间格式无效");
  }
  return parsed.toISOString();
}

function formatEventSchedule(event) {
  if (event.eventKind === "one_time") {
    return new Date(event.effectiveAt).toLocaleString("zh-CN", { hour12: false });
  }
  const weekdays = Array.isArray(event.activeWeekdays) ? event.activeWeekdays : [1, 2, 3, 4, 5, 6, 7];
  const dayText = weekdays
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b)
    .map((day) => `周${WEEKDAY_LABEL[day]}`)
    .join("、");
  return `${event.dailyStartTime ?? "00:01"} - ${event.dailyEndTime ?? "23:59"} · ${dayText || "周一至周日"}`;
}

function formatStatusLabel(status) {
  if (status === "active") return "启用";
  if (status === "paused") return "暂停";
  if (status === "deleted") return "已删除";
  return "未知";
}

function formatTypeBadge(event) {
  if (event.eventKind === "one_time") return "一次性";
  const unit = RECURRENCE_UNIT_LABEL[event.recurrenceUnit] ?? event.recurrenceUnit ?? "月";
  const interval = Number(event.recurrenceInterval ?? 1);
  return `每${interval}${unit}`;
}

function renderGoalProgress(currentBalanceYuan, events) {
  if (!goalBadge || !goalProgressFill || !goalProgressText || !goalEtaText) return;

  if (!(Number.isFinite(currentGoalTarget) && currentGoalTarget > 0)) {
    goalPanel?.classList.add("hidden");
    goalCompletionNotifiedFor = null;
    return;
  }
  goalPanel?.classList.remove("hidden");

  const current = Number(currentBalanceYuan ?? 0);
  const progress = Math.min(1, Math.max(0, current / currentGoalTarget));
  goalProgressFill.style.width = `${(progress * 100).toFixed(1)}%`;
  goalProgressText.textContent = `已存 ${formatYuan(current)} / 目标 ${formatYuan(currentGoalTarget)}（${(progress * 100).toFixed(1)}%）`;

  if (current >= currentGoalTarget) {
    goalBadge.textContent = "已完成";
    goalBadge.classList.add("completed");
    goalBadge.classList.remove("active");
    goalEtaText.textContent = "预计完成：已达成";
    const completionKey = String(currentGoalTarget);
    if (goalCompletionNotifiedFor !== completionKey) {
      goalCompletionNotifiedFor = completionKey;
      setStatus("恭喜你，已完成当前存款目标。", "success");
    }
    return;
  }

  goalBadge.textContent = "进行中";
  goalBadge.classList.add("active");
  goalBadge.classList.remove("completed");
  goalCompletionNotifiedFor = null;

  const estimatedBySchedule = estimateGoalEtaBySchedule(current, currentGoalTarget, events, new Date());
  if (estimatedBySchedule != null && Number.isFinite(estimatedBySchedule) && estimatedBySchedule > 0) {
    goalEtaText.textContent = `预计完成：约 ${formatEtaDuration(estimatedBySchedule)}`;
  } else {
    goalEtaText.textContent = "预计完成：按当前时间窗净流入≤0，暂无法预测";
  }
}

function renderJumpSpotlight(tick) {
  const numericValue = Number(tick?.displayBalanceYuan ?? 0);
  const deltaFromBalance = lastTickBalance == null ? 0 : numericValue - lastTickBalance;
  lastTickBalance = numericValue;

  const flowPerSecond = Number.isFinite(Number(tick?.flowPerSecondYuan))
    ? Number(tick.flowPerSecondYuan)
    : deltaFromBalance;

  const unitMultiplier = JUMP_UNIT_SECONDS[currentJumpUnit] ?? 1;
  const normalizedDelta = flowPerSecond * unitMultiplier;

  jumpCurrent.textContent = formatYuan(numericValue);

  jumpDelta.textContent = formatJumpByUnit(normalizedDelta, currentJumpUnit);
  const direction = flowPerSecond > 0 ? "up" : flowPerSecond < 0 ? "down" : "flat";
  jumpDelta.dataset.direction = direction;
  renderJumpRhythm(flowPerSecond, direction);
  renderGoalProgress(numericValue, tick?.events ?? cachedEvents);
}

async function handleDeleteEvent(id) {
  try {
    await patchEvent(id, { status: "deleted" });
    setStatus("事件已删除", "success");
    await reloadSummary();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleRestoreEvent(id) {
  try {
    await patchEvent(id, { status: "active" });
    setStatus("事件已恢复", "success");
    await reloadSummary();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleHardDeleteEvent(id) {
  if (!window.confirm("将彻底删除该事件，且不可恢复。确定继续吗？")) return;
  try {
    await deleteEvent(id);
    setStatus("事件已彻底删除", "success");
    await reloadSummary();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function handleEditEvent(event) {
  editingEventId = event.id;
  editingEventKind = event.eventKind;
  eventModalTitle.textContent = "编辑资金事件";
  eventSubmitBtn.textContent = "保存修改";
  eventKindSelect.disabled = false;

  const amountInput = document.getElementById("amountYuan");
  const recurrenceUnitInput = document.getElementById("recurrenceUnit");
  const recurrenceIntervalInput = document.getElementById("recurrenceInterval");

  titleInput.value = event.title ?? "";
  amountInput.value = Number(event.amountYuan).toFixed(2);
  directionSelect.value = event.direction;
  eventKindSelect.value = event.eventKind;
  effectiveAtInput.value = toDateTimeLocalValue(new Date(event.effectiveAt));

  const isRecurring = event.eventKind === "recurring";
  recurringFields.classList.toggle("hidden", !isRecurring);
  if (isRecurring) {
    recurrenceUnitInput.value = event.recurrenceUnit ?? "month";
    recurrenceIntervalInput.value = Number(event.recurrenceInterval ?? 1);
    dailyStartTimeInput.value = event.dailyStartTime ?? "00:01";
    dailyEndTimeInput.value = event.dailyEndTime ?? "23:59";
    const selected = new Set(Array.isArray(event.activeWeekdays) ? event.activeWeekdays : [1, 2, 3, 4, 5, 6, 7]);
    weekdayInputs.forEach((input) => {
      input.checked = selected.has(Number(input.value));
    });
  } else {
    weekdayInputs.forEach((input) => {
      input.checked = true;
    });
  }
  openEventModal();
}

function renderEventItem(event) {
  const li = document.createElement("li");
  li.className = "event-row";

  const content = document.createElement("div");
  content.className = "event-row-text";

  const title = document.createElement("div");
  title.className = "event-row-title";
  title.textContent = event.title?.trim() || "未命名事件";

  const amount = document.createElement("div");
  amount.className = `event-row-amount ${event.direction === "inflow" ? "inflow" : "outflow"}`;
  amount.textContent = `${event.direction === "inflow" ? "+" : "-"}${formatYuan(event.amountYuan)}`;

  const meta = document.createElement("div");
  meta.className = "event-row-meta";

  const typeBadge = document.createElement("span");
  typeBadge.className = "event-type-badge";
  typeBadge.textContent = formatTypeBadge(event);

  const metaLine = document.createElement("div");
  metaLine.className = "event-meta-line";
  metaLine.textContent = formatEventSchedule(event);

  const statusBadge = document.createElement("span");
  statusBadge.className = "event-status-badge";
  statusBadge.dataset.status = event.status;
  statusBadge.textContent = formatStatusLabel(event.status);

  meta.append(typeBadge, metaLine, statusBadge);
  content.append(title, amount, meta);

  const actions = document.createElement("div");
  actions.className = "event-actions";
  if (event.status === "deleted") {
    const restoreAction = document.createElement("button");
    restoreAction.type = "button";
    restoreAction.className = "restore-btn";
    restoreAction.textContent = "恢复";
    restoreAction.addEventListener("click", () => handleRestoreEvent(event.id));
    const hardDeleteAction = document.createElement("button");
    hardDeleteAction.type = "button";
    hardDeleteAction.className = "hard-delete-btn";
    hardDeleteAction.textContent = "彻底删除";
    hardDeleteAction.addEventListener("click", () => handleHardDeleteEvent(event.id));
    actions.append(restoreAction, hardDeleteAction);
  } else {
    const editAction = document.createElement("button");
    editAction.type = "button";
    editAction.className = "edit-btn";
    editAction.textContent = "编辑";
    editAction.addEventListener("click", () => handleEditEvent(event));
    const softDeleteAction = document.createElement("button");
    softDeleteAction.type = "button";
    softDeleteAction.className = "danger-btn";
    softDeleteAction.textContent = "删除";
    softDeleteAction.addEventListener("click", () => handleDeleteEvent(event.id));
    actions.append(editAction, softDeleteAction);
  }

  li.append(content, actions);
  return li;
}

function renderEventList(events, { hasHiddenSystemEvents = false } = {}) {
  eventList.innerHTML = "";

  if (!events.length) {
    const empty = document.createElement("li");
    empty.className = "event-row";
    empty.textContent = hasHiddenSystemEvents
      ? "暂无可见事件，系统自动事件已隐藏。可前往“设置”开启显示。"
      : "暂无事件，请前往首页点击“快捷新增事件”开始记录。";
    eventList.appendChild(empty);
    return;
  }

  events.slice(0, 20).forEach((event) => {
    eventList.appendChild(renderEventItem(event));
  });
}

async function loadGoalSettings() {
  const settings = await getSavingsGoalSettings();
  currentGoalTarget = Number(settings?.savingsGoalTargetYuan ?? null);
  if (goalTargetBalanceInput && Number.isFinite(currentGoalTarget) && currentGoalTarget > 0) {
    goalTargetBalanceInput.value = currentGoalTarget.toFixed(2);
  }
}

async function reloadSummary() {
  const [snapshot, tick, events] = await Promise.all([getSnapshot(), getRealtimeBalance(), listEvents()]);
  cachedEvents = events;
  const visibleEvents = filterRecentEvents(events, showSystemGeneratedRecentEvents);
  renderJumpSpotlight({
    displayBalanceYuan: snapshot.currentBalanceYuan,
    flowPerSecondYuan: tick.flowPerSecondYuan,
    events
  });
  renderEventList(visibleEvents, { hasHiddenSystemEvents: visibleEvents.length < events.length });
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.target));
});

openEventModalBtn?.addEventListener("click", openEventModal);
closeEventModalBtn?.addEventListener("click", closeEventModal);
eventModal?.addEventListener("click", (event) => {
  if (event.target === eventModal) {
    closeEventModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !eventModal?.classList.contains("hidden")) {
    closeEventModal();
  }
});

snapshotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(snapshotForm);
  const initialBalanceYuan = Number(formData.get("initialBalanceYuan"));
  try {
    setStatus("正在保存...", "loading");
    await putSnapshot(initialBalanceYuan);
    setStatus("初始存款已保存", "success");
    await reloadSummary();
    switchPanel("homePanel");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

jumpUnitSelect?.addEventListener("change", async () => {
  const nextUnit = jumpUnitSelect?.value ?? "second";
  applyJumpUnit(nextUnit);
  saveJumpUnit(nextUnit);
  setStatus(`跳动维度已切换为 ${jumpUnitLabel(nextUnit)}`, "success");
  await reloadSummary();
});

goalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(goalForm);
  const target = Number(formData.get("goalTargetBalanceYuan"));
  if (!(Number.isFinite(target) && target > 0)) {
    setStatus("目标余额必须大于 0", "error");
    return;
  }

  try {
    setStatus("正在保存目标...", "loading");
    const settings = await putSavingsGoalSettings(target);
    currentGoalTarget = Number(settings.savingsGoalTargetYuan);
    goalCompletionNotifiedFor = null;
    setStatus("存款目标已保存", "success");
    await reloadSummary();
    switchPanel("homePanel");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

clearLocalDataBtn?.addEventListener("click", async () => {
  const confirmed = window.confirm("确认清除所有本地数据吗？此操作不可恢复。");
  if (!confirmed) return;

  try {
    setStatus("正在清除本地数据...", "loading");
    await clearAllLocalData();
    try {
      localStorage.removeItem(JUMP_UNIT_STORAGE_KEY);
      localStorage.removeItem(RECENT_SHOW_SYSTEM_EVENTS_STORAGE_KEY);
    } catch {
      // ignore local storage failures
    }
    applyJumpUnit("second");
    applySystemEventVisibility(false);
    currentGoalTarget = null;
    goalCompletionNotifiedFor = null;
    if (goalTargetBalanceInput) {
      goalTargetBalanceInput.value = "";
    }
    await reloadSummary();
    switchPanel("homePanel");
    setStatus("本地数据已清除", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

recentShowSystemGeneratedInput?.addEventListener("change", async () => {
  const enabled = Boolean(recentShowSystemGeneratedInput?.checked);
  applySystemEventVisibility(enabled);
  saveSystemEventVisibility(enabled);
  setStatus(enabled ? "近期事件将显示系统自动事件" : "近期事件已隐藏系统自动事件", "success");
  await reloadSummary();
  switchPanel("recentPanel");
});

eventKindSelect.addEventListener("change", () => {
  const isRecurring = eventKindSelect.value === "recurring";
  recurringFields.classList.toggle("hidden", !isRecurring);
});

titleInput?.addEventListener("input", () => {
  const text = String(titleInput.value ?? "");
  if (text.includes("工资")) {
    directionSelect.value = "inflow";
    return;
  }
  if (text.includes("贷")) {
    directionSelect.value = "outflow";
  }
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    amountYuan: Number(formData.get("amountYuan")),
    direction: formData.get("direction"),
    eventKind: formData.get("eventKind"),
    effectiveAt: normalizeDateTimeLocal(formData.get("effectiveAt"))
  };
  if (editingEventId != null && !payload.eventKind) {
    payload.eventKind = editingEventKind;
  }

  if (payload.eventKind === "recurring") {
    if ((formData.get("dailyStartTime") ?? "").trim() === "00:00") {
      setStatus("每日开始时间不能为 00:00，请至少填写 00:01", "error");
      return;
    }
    payload.recurrenceUnit = formData.get("recurrenceUnit");
    payload.recurrenceInterval = Number(formData.get("recurrenceInterval"));
    payload.dailyStartTime = String(formData.get("dailyStartTime") || "00:01");
    payload.dailyEndTime = String(formData.get("dailyEndTime") || "23:59");
    payload.activeWeekdays = formData
      .getAll("activeWeekdays")
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
    if (!payload.activeWeekdays.length) {
      setStatus("请至少选择一个生效日（周一到周日）", "error");
      return;
    }
  }

  try {
    setStatus("正在保存事件...", "loading");
    if (editingEventId != null) {
      const patchPayload = {
        title: payload.title,
        direction: payload.direction,
        amountYuan: payload.amountYuan,
        effectiveAt: payload.effectiveAt
      };
      if (payload.eventKind === "recurring") {
        patchPayload.recurrenceUnit = payload.recurrenceUnit;
        patchPayload.recurrenceInterval = payload.recurrenceInterval;
        patchPayload.dailyStartTime = payload.dailyStartTime;
        patchPayload.dailyEndTime = payload.dailyEndTime;
        patchPayload.activeWeekdays = payload.activeWeekdays;
      }
      await patchEvent(editingEventId, patchPayload);
      setStatus("事件已更新", "success");
    } else {
      await createEvent(payload);
      setStatus("事件已创建", "success");
    }
    await reloadSummary();
    closeEventModal();
    switchPanel("homePanel");
    eventForm.reset();
    recurringFields.classList.add("hidden");
    eventKindSelect.value = "one_time";
    eventKindSelect.disabled = false;
    editingEventKind = null;
    effectiveAtInput.value = toDateTimeLocalValue(new Date());
    dailyStartTimeInput.value = "00:01";
    dailyEndTimeInput.value = "23:59";
    weekdayInputs.forEach((input) => {
      input.checked = true;
    });
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function init() {
  initJumpStair();
  applyJumpUnit(getSavedJumpUnit());
  applySystemEventVisibility(getSavedSystemEventVisibility());

  try {
    setStatus("加载中...", "loading");
    await loadGoalSettings();
    await reloadSummary();
    setStatus("", "info");
  } catch (error) {
    setStatus(error.message, "error");
  }

  startBalancePolling({
    onTick: (tick) => {
      renderJumpSpotlight(tick);
    },
    onError: (error) => setStatus(error.message, "error")
  });

  startRealtimeClock();
}

init();
