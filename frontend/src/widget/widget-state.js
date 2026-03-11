export const WIDGET_VIEW_STATE = {
  LOADING: "loading",
  EMPTY: "empty",
  READY: "ready",
  ERROR: "error"
};

export const DEFAULT_WIDGET_PREFERENCES = {
  version: 1,
  x: 20,
  y: 20,
  width: 248,
  height: 146,
  opacity: 0.95,
  alwaysOnTop: false,
  collapsed: false,
  allowSimultaneousDisplay: false,
  startupMode: "manual",
  updatedAt: null
};

export function createInitialWidgetRuntimeState() {
  return {
    visible: true,
    connectionState: WIDGET_VIEW_STATE.LOADING,
    displayBalanceYuan: null,
    flowPerSecondYuan: 0,
    lastTickAt: null,
    errorCode: null,
    errorMessage: null,
    isSyncing: false
  };
}

export function normalizeWidgetPreferences(input) {
  const next = { ...DEFAULT_WIDGET_PREFERENCES, ...(input ?? {}) };
  next.opacity = Math.min(1, Math.max(0.4, Number(next.opacity ?? 0.95)));
  next.width = Math.max(220, Number(next.width ?? 360));
  next.height = Math.max(72, Number(next.height ?? 220));
  next.startupMode = next.startupMode === "auto" ? "auto" : "manual";
  next.alwaysOnTop = Boolean(next.alwaysOnTop);
  next.collapsed = Boolean(next.collapsed);
  next.allowSimultaneousDisplay = Boolean(next.allowSimultaneousDisplay);
  return next;
}

export function mapWidgetError(error) {
  const message = String(error?.message ?? "桌面组件连接异常");
  return {
    code: "WIDGET_RUNTIME_ERROR",
    message
  };
}

export function applyWidgetTick(state, tick) {
  if (!(Number.isFinite(Number(tick?.displayBalanceYuan)))) {
    return {
      ...state,
      connectionState: WIDGET_VIEW_STATE.EMPTY,
      displayBalanceYuan: null,
      flowPerSecondYuan: 0,
      lastTickAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: null,
      isSyncing: false
    };
  }
  return {
    ...state,
    connectionState: WIDGET_VIEW_STATE.READY,
    displayBalanceYuan: Number(tick.displayBalanceYuan),
    flowPerSecondYuan: Number(tick?.flowPerSecondYuan ?? 0),
    lastTickAt: String(tick?.timestamp ?? new Date().toISOString()),
    errorCode: null,
    errorMessage: null,
    isSyncing: false
  };
}

export function applyWidgetError(state, error) {
  const mapped = mapWidgetError(error);
  return {
    ...state,
    connectionState: WIDGET_VIEW_STATE.ERROR,
    errorCode: mapped.code,
    errorMessage: mapped.message,
    isSyncing: false
  };
}
