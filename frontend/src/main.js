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
  putSnapshot,
  submitHelpFeedback
} from "./api-client.js";
import { startBalancePolling } from "./balance-engine.js";
import { formatEtaDuration, formatJumpByUnit, formatYuan, formatYuanDynamic, jumpUnitLabel } from "./formatters.js";
import { estimateGoalEtaBySchedule } from "./goal-eta.js";
import { resolveJumpDisplayDeltaByUnit } from "./jump-flow.js";
import { resolveStairActiveSteps, resolveStairTierFromActiveSteps } from "./jump-stair.js";
import {
  closeMainWindowToTray,
  getWidgetPreferences,
  hideWidgetWindow,
  minimizeMainWindow,
  saveWidgetPreferences,
  showWidgetWindow,
  startMainWindowDragging,
  setWidgetTopmost,
  toggleMainWindowMaximized
} from "./widget/widget-bridge.js";

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
const showSystemEventsToggle = document.getElementById("showSystemEventsToggle");
const autoSwitchHomeAfterEventSaveToggle = document.getElementById("autoSwitchHomeAfterEventSaveToggle");
const widgetShowOnTrayMain = document.getElementById("widgetShowOnTrayMain");
const widgetTopmostMain = document.getElementById("widgetTopmostMain");
const widgetAllowSimultaneousMain = document.getElementById("widgetAllowSimultaneousMain");
const appHeadDrag = document.querySelector(".app-head-drag");
const windowMinBtn = document.getElementById("windowMinBtn");
const windowMaxBtn = document.getElementById("windowMaxBtn");
const windowCloseBtn = document.getElementById("windowCloseBtn");
const topFrame = document.querySelector(".top-frame");
const helpFeedbackForm = document.getElementById("helpFeedbackForm");
const issueFeedbackInput = document.getElementById("issueFeedback");
const featureExpectationInput = document.getElementById("featureExpectation");
const helpContactStage = document.getElementById("helpContactStage");
const feedbackContactInput = document.getElementById("feedbackContact");
const helpFeedbackStartBtn = document.getElementById("helpFeedbackStartBtn");
const helpFeedbackStatus = document.getElementById("helpFeedbackStatus");
const helpSupportEmailBtn = document.getElementById("helpSupportEmailBtn");

const STAIR_STEP_COUNT = 14;
const JUMP_UNIT_STORAGE_KEY = "moneyflow.ui.jumpUnit";
const SHOW_SYSTEM_EVENTS_STORAGE_KEY = "moneyflow.ui.showSystemEvents";
const AUTO_SWITCH_HOME_AFTER_EVENT_SAVE_STORAGE_KEY = "moneyflow.ui.autoSwitchHomeAfterEventSave";
const JUMP_UNIT_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000,
  year: 31104000
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
let currentJumpUnit = "hour";
let currentGoalTarget = null;
let goalCompletionNotifiedFor = null;
let cachedEvents = [];
let editingEventId = null;
let editingEventKind = null;
let topFrameSyncRaf = null;
let lastHelpSubmitAt = 0;
let emailCopyPressTimer = null;

function syncTopFrameLayout() {
  if (!topFrame) return;
  const height = Math.max(90, Math.ceil(topFrame.getBoundingClientRect().height));
  document.documentElement.style.setProperty("--top-frame-height", `${height}px`);
}

function requestTopFrameLayoutSync() {
  if (topFrameSyncRaf != null) return;
  topFrameSyncRaf = window.requestAnimationFrame(() => {
    topFrameSyncRaf = null;
    syncTopFrameLayout();
  });
}

function setHelpFeedbackStatus(message, type = "info") {
  if (!helpFeedbackStatus) return;
  if (!message) {
    helpFeedbackStatus.textContent = "";
    helpFeedbackStatus.classList.add("hidden");
    return;
  }
  helpFeedbackStatus.textContent = message;
  helpFeedbackStatus.dataset.type = type;
  helpFeedbackStatus.classList.remove("hidden");
}

function normalizeHelpFeedbackPayload() {
  return {
    issueFeedback: String(issueFeedbackInput?.value ?? "").trim(),
    featureExpectation: String(featureExpectationInput?.value ?? "").trim(),
    contact: String(feedbackContactInput?.value ?? "").trim()
  };
}

function validateHelpFeedbackInput(payload) {
  const combined = `${payload.issueFeedback}\n${payload.featureExpectation}`.trim();
  if (!combined) {
    return "请至少填写“系统问题反馈”或“期望功能开发”其中一项";
  }
  if (combined.length < 4) {
    return "反馈内容过短，请补充更多细节";
  }
  if (combined.length > 1500) {
    return "反馈内容过长，请精简后再提交";
  }
  const riskyPattern = /<script|<\/script>|javascript:|onerror=|onload=|drop\s+table|union\s+select/i;
  if (riskyPattern.test(combined)) {
    return "反馈内容包含不安全字符，请调整后重试";
  }
  const urlMatches = combined.match(/https?:\/\/|www\./gi) ?? [];
  if (urlMatches.length > 4) {
    return "检测到过多链接，请精简后提交";
  }
  return null;
}

async function copySupportEmail() {
  const email = "835823869@qq.com";
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(email);
    } else {
      const helper = document.createElement("textarea");
      helper.value = email;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.focus();
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }
    setStatus("邮箱已复制", "success");
  } catch {
    setStatus(`请手动复制：${email}`, "loading");
  }
}

async function submitHelpFeedbackFlow() {
  const payload = normalizeHelpFeedbackPayload();
  const ruleError = validateHelpFeedbackInput(payload);
  if (ruleError) {
    setHelpFeedbackStatus(ruleError, "error");
    return;
  }
  if (Date.now() - lastHelpSubmitAt < 10000) {
    setHelpFeedbackStatus("提交过于频繁，请稍后再试", "error");
    return;
  }

  try {
    setHelpFeedbackStatus("正在提交反馈...", "loading");
    if (helpFeedbackStartBtn) helpFeedbackStartBtn.disabled = true;
    await submitHelpFeedback(payload);
    lastHelpSubmitAt = Date.now();
    const successMessage = "提交成功！感谢你的反馈与建议，我们会认真评估并持续改进产品。";
    setHelpFeedbackStatus(successMessage, "success");
    helpFeedbackForm?.reset();
  } catch (error) {
    setHelpFeedbackStatus(error.message, "error");
  } finally {
    if (helpFeedbackStartBtn) helpFeedbackStartBtn.disabled = false;
  }
}

function getSavedJumpUnit() {
  try {
    const stored = localStorage.getItem(JUMP_UNIT_STORAGE_KEY);
    if (stored && Object.hasOwn(JUMP_UNIT_SECONDS, stored)) return stored;
  } catch {
    // ignore local storage failures
  }
  return "hour";
}

function saveJumpUnit(unit) {
  try {
    localStorage.setItem(JUMP_UNIT_STORAGE_KEY, unit);
  } catch {
    // ignore local storage failures
  }
}

function shouldShowSystemEvents() {
  try {
    const stored = localStorage.getItem(SHOW_SYSTEM_EVENTS_STORAGE_KEY);
    if (stored === null) return false;
    return stored === "1";
  } catch {
    return false;
  }
}

function saveShowSystemEvents(value) {
  try {
    localStorage.setItem(SHOW_SYSTEM_EVENTS_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore local storage failures
  }
}

function shouldAutoSwitchHomeAfterEventSave() {
  try {
    const stored = localStorage.getItem(AUTO_SWITCH_HOME_AFTER_EVENT_SAVE_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

function saveAutoSwitchHomeAfterEventSave(value) {
  try {
    localStorage.setItem(AUTO_SWITCH_HOME_AFTER_EVENT_SAVE_STORAGE_KEY, value ? "1" : "0");
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
  if (!jumpStair) return;
  if (jumpStair.childElementCount !== STAIR_STEP_COUNT) {
    jumpStair.innerHTML = "";
  }
  if (jumpStair.childElementCount > 0) return;
  for (let i = 0; i < STAIR_STEP_COUNT; i += 1) {
    const step = document.createElement("span");
    step.className = "stair-step";
    step.style.setProperty("--step-index", String(i));
    jumpStair.appendChild(step);
  }
}

function renderJumpRhythm(flowPerSecond, unitDelta, jumpUnit) {
  if (!jumpStair) return;
  const children = Array.from(jumpStair.children);
  const activeSteps = resolveStairActiveSteps({
    unitDelta,
    jumpUnit,
    stepCount: STAIR_STEP_COUNT
  });
  const direction = flowPerSecond > 0 ? "up" : flowPerSecond < 0 ? "down" : "flat";
  jumpStair.dataset.direction = direction;
  jumpStair.dataset.level = String(activeSteps);
  const tier = resolveStairTierFromActiveSteps(activeSteps, STAIR_STEP_COUNT);
  jumpStair.dataset.tier = tier;
  if (jumpDelta) {
    jumpDelta.dataset.tier = tier;
  }
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
  if (!editingEventId) {
    resetEventFormToCreateDefaults();
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
  resetEventFormToCreateDefaults();
  eventModal?.classList.add("hidden");
}

function resetEventFormToCreateDefaults() {
  eventForm?.reset();
  recurringFields?.classList.add("hidden");
  if (eventKindSelect) eventKindSelect.value = "one_time";
  if (directionSelect) directionSelect.value = "outflow";
  if (effectiveAtInput) effectiveAtInput.value = toDateTimeLocalValue(new Date());
  if (dailyStartTimeInput) dailyStartTimeInput.value = "00:01";
  if (dailyEndTimeInput) dailyEndTimeInput.value = "23:59";
  weekdayInputs.forEach((input) => {
    input.checked = true;
  });
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
  goalProgressText.textContent = `已存 ${formatYuanDynamic(current, 0)} / 目标 ${formatYuanDynamic(currentGoalTarget, 0)}（${(progress * 100).toFixed(1)}%）`;

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

  const realtimeFlowPerSecond = Number.isFinite(Number(tick?.flowPerSecondYuan))
    ? Number(tick.flowPerSecondYuan)
    : deltaFromBalance;
  const normalizedDelta = resolveJumpDisplayDeltaByUnit({
    jumpUnit: currentJumpUnit,
    realtimeFlowPerSecondYuan: realtimeFlowPerSecond,
    events: tick?.events ?? cachedEvents,
    now: tick?.timestamp ? new Date(tick.timestamp) : new Date()
  });
  const unitMultiplier = JUMP_UNIT_SECONDS[currentJumpUnit] ?? 1;
  const directionSource = normalizedDelta;

  jumpCurrent.textContent = formatYuan(numericValue);

  jumpDelta.textContent = formatJumpByUnit(normalizedDelta, currentJumpUnit);
  const direction = directionSource > 0 ? "up" : directionSource < 0 ? "down" : "flat";
  jumpDelta.dataset.direction = direction;
  renderJumpRhythm(normalizedDelta / unitMultiplier, normalizedDelta, currentJumpUnit);
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

  const head = document.createElement("div");
  head.className = "event-row-head";

  const title = document.createElement("div");
  title.className = "event-row-title";
  title.textContent = event.title?.trim() || "未命名事件";

  const amount = document.createElement("div");
  amount.className = `event-row-amount ${event.direction === "inflow" ? "inflow" : "outflow"}`;
  amount.textContent = `${event.direction === "inflow" ? "+" : "-"}${formatYuan(event.amountYuan)}`;
  head.append(title, amount);

  const meta = document.createElement("div");
  meta.className = "event-row-tags";

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

  meta.append(typeBadge, statusBadge);
  content.append(head, meta, metaLine);

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

function renderEventList(events) {
  eventList.innerHTML = "";

  const visibleEvents = shouldShowSystemEvents()
    ? events
    : events.filter((event) => !String(event?.title ?? "").includes("（历史结转）"));

  if (!visibleEvents.length) {
    const empty = document.createElement("li");
    empty.className = "event-row";
    empty.textContent = "暂无可显示事件，请前往首页点击“快捷新增事件”开始记录。";
    eventList.appendChild(empty);
    return;
  }

  visibleEvents.slice(0, 20).forEach((event) => {
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
  renderJumpSpotlight({
    displayBalanceYuan: snapshot.currentBalanceYuan,
    flowPerSecondYuan: tick.flowPerSecondYuan,
    events
  });
  renderEventList(events);
}

async function loadWidgetPreferencesIntoMainPanel() {
  if (!widgetShowOnTrayMain && !widgetTopmostMain && !widgetAllowSimultaneousMain) return;
  const preferences = await getWidgetPreferences();
  if (widgetShowOnTrayMain) {
    widgetShowOnTrayMain.checked = (preferences.startupMode ?? "manual") === "auto";
  }
  if (widgetTopmostMain) {
    widgetTopmostMain.checked = Boolean(preferences.alwaysOnTop);
  }
  if (widgetAllowSimultaneousMain) {
    widgetAllowSimultaneousMain.checked = Boolean(preferences.allowSimultaneousDisplay);
  }
}

async function persistWidgetPreferencesFromMainPanel() {
  const latest = await getWidgetPreferences();
  const next = {
    ...latest,
    startupMode: widgetShowOnTrayMain?.checked ? "auto" : "manual",
    alwaysOnTop: Boolean(widgetTopmostMain?.checked),
    allowSimultaneousDisplay: Boolean(widgetAllowSimultaneousMain?.checked)
  };
  await setWidgetTopmost(next.alwaysOnTop);
  await saveWidgetPreferences(next);
}

async function saveWidgetPreferencesFromControls() {
  await persistWidgetPreferencesFromMainPanel();
  setStatus("组件设置已自动保存", "success");
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.target));
});

openEventModalBtn?.addEventListener("click", openEventModal);
closeEventModalBtn?.addEventListener("click", closeEventModal);
eventModal?.addEventListener("click", (event) => {
  event.stopPropagation();
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

async function saveJumpUnitSelection({ switchToHome = false } = {}) {
  const nextUnit = jumpUnitSelect?.value ?? "second";
  applyJumpUnit(nextUnit);
  saveJumpUnit(nextUnit);
  setStatus(`跳动维度已自动保存为 ${jumpUnitLabel(nextUnit)}`, "success");
  await reloadSummary();
  if (switchToHome) {
    switchPanel("homePanel");
  }
}

jumpUnitSelect?.addEventListener("change", async () => {
  await saveJumpUnitSelection();
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
      localStorage.removeItem(SHOW_SYSTEM_EVENTS_STORAGE_KEY);
      localStorage.removeItem(AUTO_SWITCH_HOME_AFTER_EVENT_SAVE_STORAGE_KEY);
    } catch {
      // ignore local storage failures
    }
    applyJumpUnit("hour");
    if (showSystemEventsToggle) {
      showSystemEventsToggle.checked = shouldShowSystemEvents();
    }
    if (autoSwitchHomeAfterEventSaveToggle) {
      autoSwitchHomeAfterEventSaveToggle.checked = shouldAutoSwitchHomeAfterEventSave();
    }
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

widgetShowOnTrayMain?.addEventListener("change", async () => {
  try {
    await saveWidgetPreferencesFromControls();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

widgetTopmostMain?.addEventListener("change", async () => {
  try {
    await saveWidgetPreferencesFromControls();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

widgetAllowSimultaneousMain?.addEventListener("change", async () => {
  try {
    await saveWidgetPreferencesFromControls();
    if (widgetAllowSimultaneousMain.checked) {
      await showWidgetWindow();
    } else {
      await hideWidgetWindow();
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

showSystemEventsToggle?.addEventListener("change", () => {
  const nextValue = Boolean(showSystemEventsToggle.checked);
  saveShowSystemEvents(nextValue);
  renderEventList(cachedEvents);
  setStatus(nextValue ? "已显示系统自动事件" : "已隐藏系统自动事件", "success");
});

autoSwitchHomeAfterEventSaveToggle?.addEventListener("change", () => {
  const nextValue = Boolean(autoSwitchHomeAfterEventSaveToggle.checked);
  saveAutoSwitchHomeAfterEventSave(nextValue);
  setStatus(nextValue ? "已开启事件保存后自动跳转主页" : "已关闭事件保存后自动跳转主页", "success");
});

windowMinBtn?.addEventListener("click", async () => {
  try {
    await minimizeMainWindow();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

windowMaxBtn?.addEventListener("click", async () => {
  try {
    await toggleMainWindowMaximized();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

windowCloseBtn?.addEventListener("click", async () => {
  try {
    await closeMainWindowToTray();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

appHeadDrag?.addEventListener("mousedown", async (event) => {
  if (event.button !== 0) return;
  try {
    await startMainWindowDragging();
  } catch {
    // ignore in browser fallback runtime
  }
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
        eventKind: payload.eventKind,
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
      } else {
        patchPayload.recurrenceUnit = null;
        patchPayload.recurrenceInterval = null;
        patchPayload.dailyStartTime = null;
        patchPayload.dailyEndTime = null;
        patchPayload.activeWeekdays = null;
      }
      await patchEvent(editingEventId, patchPayload);
      setStatus("事件已更新", "success");
    } else {
      await createEvent(payload);
      setStatus("事件已创建", "success");
    }
    await reloadSummary();
    closeEventModal();
    if (shouldAutoSwitchHomeAfterEventSave()) {
      switchPanel("homePanel");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

helpFeedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitHelpFeedbackFlow();
});

helpSupportEmailBtn?.addEventListener("pointerdown", () => {
  if (emailCopyPressTimer) clearTimeout(emailCopyPressTimer);
  emailCopyPressTimer = setTimeout(() => {
    emailCopyPressTimer = null;
    copySupportEmail();
  }, 500);
});
helpSupportEmailBtn?.addEventListener("pointerup", () => {
  if (emailCopyPressTimer) {
    clearTimeout(emailCopyPressTimer);
    emailCopyPressTimer = null;
  }
});
helpSupportEmailBtn?.addEventListener("pointerleave", () => {
  if (emailCopyPressTimer) {
    clearTimeout(emailCopyPressTimer);
    emailCopyPressTimer = null;
  }
});
helpSupportEmailBtn?.addEventListener("click", async () => {
  await copySupportEmail();
});

issueFeedbackInput?.addEventListener("input", () => setHelpFeedbackStatus(""));
featureExpectationInput?.addEventListener("input", () => setHelpFeedbackStatus(""));
feedbackContactInput?.addEventListener("input", () => setHelpFeedbackStatus(""));
window.addEventListener("resize", requestTopFrameLayoutSync);

async function init() {
  syncTopFrameLayout();
  requestTopFrameLayoutSync();
  initJumpStair();
  applyJumpUnit(getSavedJumpUnit());
  helpContactStage?.classList.remove("hidden");
  setHelpFeedbackStatus("");
  if (showSystemEventsToggle) {
    showSystemEventsToggle.checked = shouldShowSystemEvents();
  }
  if (autoSwitchHomeAfterEventSaveToggle) {
    autoSwitchHomeAfterEventSaveToggle.checked = shouldAutoSwitchHomeAfterEventSave();
  }

  try {
    setStatus("加载中...", "loading");
    await loadGoalSettings();
    await loadWidgetPreferencesIntoMainPanel();
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
