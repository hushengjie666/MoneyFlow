import {
  createEvent,
  getRealtimeBalance,
  getSavingsGoalSettings,
  getSnapshot,
  listEvents,
  patchEvent,
  putSavingsGoalSettings,
  putSnapshot
} from "./api-client.js";
import { startBalancePolling } from "./balance-engine.js";
import { formatEtaDuration, formatJumpByUnit, formatYuan, formatYuanPrecise, jumpUnitLabel } from "./formatters.js";

const statusText = document.getElementById("statusText");
const jumpTitle = document.getElementById("jumpTitle");
const snapshotForm = document.getElementById("snapshotForm");
const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const jumpConfigForm = document.getElementById("jumpConfigForm");
const jumpUnitSelect = document.getElementById("jumpUnit");
const recurringFields = document.getElementById("recurringFields");
const eventKindSelect = document.getElementById("eventKind");
const dailyStartTimeInput = document.getElementById("dailyStartTime");
const dailyEndTimeInput = document.getElementById("dailyEndTime");
const jumpCurrent = document.getElementById("jumpCurrent");
const jumpDelta = document.getElementById("jumpDelta");
const jumpStair = document.getElementById("jumpStair");
const jumpTimestamp = document.getElementById("jumpTimestamp");
const eventModal = document.getElementById("eventModal");
const openEventModalBtn = document.getElementById("openEventModalBtn");
const closeEventModalBtn = document.getElementById("closeEventModalBtn");
const goalForm = document.getElementById("goalForm");
const goalTargetBalanceInput = document.getElementById("goalTargetBalanceYuan");
const goalBadge = document.getElementById("goalBadge");
const goalProgressFill = document.getElementById("goalProgressFill");
const goalProgressText = document.getElementById("goalProgressText");
const goalEtaText = document.getElementById("goalEtaText");
const menuButtons = Array.from(document.querySelectorAll(".menu-btn"));
const panelPages = Array.from(document.querySelectorAll(".panel-page"));

const STAIR_STEP_COUNT = 14;
const JUMP_UNIT_STORAGE_KEY = "moneyflow.ui.jumpUnit";
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

let lastTickBalance = null;
let clockTimer = null;
let statusTimer = null;
let currentJumpUnit = "second";
let currentGoalTarget = null;
let goalCompletionNotifiedFor = null;

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

  let hueFrom = 208;
  let hueTo = 252;
  if (direction === "up") {
    hueFrom = Math.round(138 + lux * 18);
    hueTo = Math.round(166 + lux * 20);
  } else if (direction === "down") {
    hueFrom = Math.round(330 + lux * 6);
    hueTo = Math.round(356 + lux * 4);
  } else {
    hueFrom = Math.round(208 + lux * 12);
    hueTo = Math.round(252 + lux * 10);
  }
  jumpStair.style.setProperty("--stair-hue-from", String(hueFrom));
  jumpStair.style.setProperty("--stair-hue-to", String(hueTo));

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
  eventModal?.classList.remove("hidden");
}

function closeEventModal() {
  eventModal?.classList.add("hidden");
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

function formatEventType(event) {
  if (event.eventKind === "one_time") return "一次性";
  const unit = RECURRENCE_UNIT_LABEL[event.recurrenceUnit] ?? event.recurrenceUnit ?? "天";
  const interval = Number(event.recurrenceInterval ?? 1);
  return `周期性 · 每${interval}${unit}`;
}

function formatEventSchedule(event) {
  if (event.eventKind === "one_time") {
    return new Date(event.effectiveAt).toLocaleString("zh-CN", { hour12: false });
  }
  return `${event.dailyStartTime ?? "00:01"} - ${event.dailyEndTime ?? "24:00"}`;
}

function renderGoalProgress(currentBalanceYuan, flowPerSecondYuan) {
  if (!goalBadge || !goalProgressFill || !goalProgressText || !goalEtaText) return;

  if (!(Number.isFinite(currentGoalTarget) && currentGoalTarget > 0)) {
    goalBadge.textContent = "未设置";
    goalBadge.classList.remove("active", "completed");
    goalProgressFill.style.width = "0%";
    goalProgressText.textContent = "请先在设置中填写存款目标";
    goalEtaText.textContent = "预计完成：--";
    goalCompletionNotifiedFor = null;
    return;
  }

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

  if (flowPerSecondYuan > 0) {
    const remainingSeconds = (currentGoalTarget - current) / flowPerSecondYuan;
    goalEtaText.textContent = `预计完成：约 ${formatEtaDuration(remainingSeconds)}`;
  } else {
    goalEtaText.textContent = "预计完成：当前净流入≤0，暂无法预测";
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

  const shouldUsePrecise = Math.abs(flowPerSecond) > 0 && Math.abs(flowPerSecond) < 0.01;
  jumpCurrent.textContent = shouldUsePrecise ? formatYuanPrecise(numericValue, 4) : formatYuan(numericValue);
  jumpCurrent.classList.remove("ticking");
  void jumpCurrent.offsetWidth;
  jumpCurrent.classList.add("ticking");

  jumpDelta.textContent = formatJumpByUnit(normalizedDelta, currentJumpUnit);
  const direction = flowPerSecond > 0 ? "up" : flowPerSecond < 0 ? "down" : "flat";
  jumpDelta.dataset.direction = direction;
  renderJumpRhythm(flowPerSecond, direction);
  renderGoalProgress(numericValue, flowPerSecond);
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
  meta.textContent = `${formatEventType(event)} · ${formatEventSchedule(event)} · 状态：${event.status}`;

  content.append(title, amount, meta);

  const action = document.createElement("button");
  action.type = "button";
  if (event.status === "deleted") {
    action.className = "restore-btn";
    action.textContent = "恢复";
    action.addEventListener("click", () => handleRestoreEvent(event.id));
  } else {
    action.className = "danger-btn";
    action.textContent = "删除";
    action.addEventListener("click", () => handleDeleteEvent(event.id));
  }

  li.append(content, action);
  return li;
}

function renderEventList(events) {
  eventList.innerHTML = "";

  if (!events.length) {
    const empty = document.createElement("li");
    empty.className = "event-row";
    empty.textContent = "暂无事件，点击“快捷新增事件”开始记录。";
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
  renderJumpSpotlight({
    displayBalanceYuan: snapshot.currentBalanceYuan,
    flowPerSecondYuan: tick.flowPerSecondYuan
  });
  renderEventList(events);
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
    setStatus("初始存款已保存（仅清除一次性事件）", "success");
    await reloadSummary();
    switchPanel("homePanel");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

jumpConfigForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nextUnit = jumpUnitSelect?.value ?? "second";
  applyJumpUnit(nextUnit);
  saveJumpUnit(nextUnit);
  setStatus(`跳动维度已切换为 ${jumpUnitLabel(nextUnit)}`, "success");
  await reloadSummary();
  switchPanel("homePanel");
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

eventKindSelect.addEventListener("change", () => {
  const isRecurring = eventKindSelect.value === "recurring";
  recurringFields.classList.toggle("hidden", !isRecurring);
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const payload = {
    title: formData.get("title"),
    eventKind: formData.get("eventKind"),
    direction: formData.get("direction"),
    amountYuan: Number(formData.get("amountYuan")),
    effectiveAt: normalizeDateTimeLocal(formData.get("effectiveAt"))
  };

  if (payload.eventKind === "recurring") {
    if ((formData.get("dailyStartTime") ?? "").trim() === "00:00") {
      setStatus("每日开始时间不能为 00:00，请至少填写 00:01", "error");
      return;
    }
    payload.recurrenceUnit = formData.get("recurrenceUnit");
    payload.recurrenceInterval = Number(formData.get("recurrenceInterval"));
    payload.dailyStartTime = formData.get("dailyStartTime");
    payload.dailyEndTime = formData.get("dailyEndTime");
  }

  try {
    setStatus("正在保存事件...", "loading");
    await createEvent(payload);
    setStatus("事件已创建", "success");
    await reloadSummary();
    closeEventModal();
    switchPanel("homePanel");
    eventForm.reset();
    recurringFields.classList.add("hidden");
    eventKindSelect.value = "one_time";
    dailyStartTimeInput.value = "00:01";
    dailyEndTimeInput.value = "24:00";
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function init() {
  initJumpStair();
  applyJumpUnit(getSavedJumpUnit());

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
