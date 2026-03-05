import { getRealtimeBalance, listEvents } from "../api-client.js";
import { startBalancePolling } from "../balance-engine.js";
import { formatJumpByUnit, formatYuan, jumpUnitLabel } from "../formatters.js";
import { resolveJumpDisplayDeltaByUnit } from "../jump-flow.js";
import { resolveStairActiveSteps, resolveStairTierFromActiveSteps } from "../jump-stair.js";
import { openMainWindow, saveWidgetWindowPosition, startWidgetDragging } from "./widget-bridge.js";
import {
  WIDGET_VIEW_STATE,
  applyWidgetError,
  applyWidgetTick,
  createInitialWidgetRuntimeState
} from "./widget-state.js";

const state = createInitialWidgetRuntimeState();

const widgetStatus = document.getElementById("widgetStatus");
const widgetJumpTitle = document.getElementById("widgetJumpTitle");
const widgetBalance = document.getElementById("widgetBalance");
const widgetFlow = document.getElementById("widgetFlow");
const widgetTimestamp = document.getElementById("widgetTimestamp");
const widgetJumpStair = document.getElementById("widgetJumpStair");
const widgetShell = document.querySelector(".widget-shell");
const STAIR_STEP_COUNT = 14;
const JUMP_UNIT_STORAGE_KEY = "moneyflow.ui.jumpUnit";
const JUMP_UNIT_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000,
  year: 31104000
};
let cachedEvents = [];
let lastEventSyncAt = 0;

function setStatus(message, type = WIDGET_VIEW_STATE.LOADING) {
  if (!widgetStatus) return;
  widgetStatus.textContent = message;
  if (message) {
    widgetStatus.dataset.state = type;
  } else {
    widgetStatus.removeAttribute("data-state");
  }
}

function initJumpStair() {
  if (!widgetJumpStair) return;
  if (widgetJumpStair.childElementCount !== STAIR_STEP_COUNT) {
    widgetJumpStair.innerHTML = "";
  }
  if (widgetJumpStair.childElementCount > 0) return;
  for (let i = 0; i < STAIR_STEP_COUNT; i += 1) {
    const step = document.createElement("span");
    step.className = "stair-step";
    step.style.setProperty("--step-index", String(i));
    widgetJumpStair.appendChild(step);
  }
}

function formatRealtimeLabel(isoText) {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "实时时间：--";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `实时时间：${year}年${month}月${day}日 ${hour}:${minute}:${second}`;
}

function renderJumpRhythm(delta, jumpUnit) {
  if (!widgetJumpStair) return;
  const activeSteps = resolveStairActiveSteps({
    unitDelta: delta,
    jumpUnit,
    stepCount: STAIR_STEP_COUNT
  });
  const tier = resolveStairTierFromActiveSteps(activeSteps, STAIR_STEP_COUNT);
  let direction = "flat";
  if (delta > 0) direction = "up";
  if (delta < 0) direction = "down";
  widgetFlow.dataset.direction = direction;
  widgetFlow.dataset.tier = tier;
  widgetJumpStair.dataset.direction = direction;
  widgetJumpStair.dataset.tier = tier;
  Array.from(widgetJumpStair.children).forEach((node, index) => {
    node.classList.toggle("active", index < activeSteps);
  });
}

function resolveWidgetJumpUnit() {
  try {
    const stored = localStorage.getItem(JUMP_UNIT_STORAGE_KEY);
    if (stored && Object.hasOwn(JUMP_UNIT_SECONDS, stored)) return stored;
  } catch {
    // ignore local storage failures
  }
  return "hour";
}

async function syncEventsIfNeeded(force = false) {
  const nowMs = Date.now();
  if (!force && nowMs - lastEventSyncAt < 2500) return;
  cachedEvents = await listEvents();
  lastEventSyncAt = nowMs;
}

function renderRuntime(nextState) {
  const jumpUnit = resolveWidgetJumpUnit();
  const unitFlow = resolveJumpDisplayDeltaByUnit({
    jumpUnit,
    realtimeFlowPerSecondYuan: Number(nextState.flowPerSecondYuan ?? 0),
    events: cachedEvents,
    now: nextState.lastTickAt ? new Date(nextState.lastTickAt) : new Date()
  });
  if (widgetJumpTitle) {
    widgetJumpTitle.textContent = `资金数字跳动 · ${jumpUnitLabel(jumpUnit)}`;
  }
  if (widgetBalance) {
    widgetBalance.textContent =
      nextState.displayBalanceYuan == null ? "--" : formatYuan(nextState.displayBalanceYuan);
  }
  if (widgetFlow) {
    widgetFlow.textContent = formatJumpByUnit(unitFlow, jumpUnit);
  }
  if (widgetTimestamp) {
    widgetTimestamp.textContent = nextState.lastTickAt
      ? formatRealtimeLabel(nextState.lastTickAt)
      : "实时时间：--";
  }
  renderJumpRhythm(unitFlow, jumpUnit);

  if (nextState.connectionState === WIDGET_VIEW_STATE.READY) {
    setStatus("", WIDGET_VIEW_STATE.READY);
    return;
  }
  if (nextState.connectionState === WIDGET_VIEW_STATE.EMPTY) {
    setStatus("", WIDGET_VIEW_STATE.EMPTY);
    return;
  }
  if (nextState.connectionState === WIDGET_VIEW_STATE.ERROR) {
    setStatus(nextState.errorMessage ?? "连接失败", WIDGET_VIEW_STATE.ERROR);
    return;
  }
  setStatus("加载中...", WIDGET_VIEW_STATE.LOADING);
}

function bindWindowDragging() {
  const dragState = {
    originX: 0,
    originY: 0,
    pressed: false,
    dragging: false
  };
  let persistTimer = null;
  const shouldIgnoreDragTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, a, input, select, textarea, [role='button']"));
  };

  const persistWidgetPosition = () => {
    if (!dragState.dragging) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(async () => {
      try {
        await saveWidgetWindowPosition();
      } catch {
        // ignore runtime differences between tauri and browser
      }
    }, 160);
  };

  const resetDragState = () => {
    persistWidgetPosition();
    dragState.pressed = false;
    dragState.dragging = false;
  };

  const beginPress = (event) => {
    if (event.button !== 0) return;
    if (shouldIgnoreDragTarget(event.target)) return;
    dragState.pressed = true;
    dragState.dragging = false;
    dragState.originX = event.clientX;
    dragState.originY = event.clientY;
  };

  const handlePointerMove = async (event) => {
    if (!dragState.pressed || dragState.dragging) return;
    const dx = Math.abs(event.clientX - dragState.originX);
    const dy = Math.abs(event.clientY - dragState.originY);
    if (dx + dy < 3) return;
    dragState.dragging = true;
    try {
      await startWidgetDragging();
    } catch {
      // ignore runtime differences between tauri and browser
    }
  };

  const handleOpenMain = async () => {
    resetDragState();
    try {
      await openMainWindow();
    } catch {
      // ignore runtime differences between tauri and browser
    }
  };

  widgetShell?.addEventListener("mousedown", beginPress);
  widgetShell?.addEventListener("mousemove", handlePointerMove);
  widgetShell?.addEventListener("mouseup", resetDragState);
  widgetShell?.addEventListener("mouseleave", resetDragState);
  widgetShell?.addEventListener("dblclick", handleOpenMain);
}

async function init() {
  setStatus("加载中...", WIDGET_VIEW_STATE.LOADING);
  initJumpStair();
  bindWindowDragging();

  try {
    const [tick] = await Promise.all([getRealtimeBalance(), syncEventsIfNeeded(true)]);
    Object.assign(state, applyWidgetTick(state, tick));
    renderRuntime(state);
  } catch (error) {
    Object.assign(state, applyWidgetError(state, error));
    renderRuntime(state);
  }

  startBalancePolling({
    onTick: async (tick) => {
      try {
        await syncEventsIfNeeded();
      } catch {
        // fallback to previous cached events
      }
      Object.assign(state, applyWidgetTick(state, tick));
      renderRuntime(state);
    },
    onError: (error) => {
      Object.assign(state, applyWidgetError(state, error));
      renderRuntime(state);
    }
  });
}

init();
