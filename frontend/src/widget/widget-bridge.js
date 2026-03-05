import { DEFAULT_WIDGET_PREFERENCES, normalizeWidgetPreferences } from "./widget-state.js";

const PREFERENCE_STORAGE_KEY = "moneyflow.widget.preferences.v1";

function resolveInvoke() {
  const tauriCoreInvoke = globalThis?.window?.__TAURI__?.core?.invoke;
  if (typeof tauriCoreInvoke === "function") return tauriCoreInvoke;
  const tauriInternalsInvoke = globalThis?.window?.__TAURI_INTERNALS__?.invoke;
  if (typeof tauriInternalsInvoke === "function") return tauriInternalsInvoke;
  return null;
}

function readLocalPreferenceFallback() {
  try {
    const raw = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WIDGET_PREFERENCES };
    const parsed = JSON.parse(raw);
    return normalizeWidgetPreferences(parsed);
  } catch {
    return { ...DEFAULT_WIDGET_PREFERENCES };
  }
}

function writeLocalPreferenceFallback(preferences) {
  const normalized = normalizeWidgetPreferences(preferences);
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore local storage failures
  }
  return normalized;
}

async function invokeOrFallback(command, payload, fallbackValue) {
  const invoke = resolveInvoke();
  if (!invoke) return fallbackValue;
  try {
    return await invoke(command, payload);
  } catch {
    return fallbackValue;
  }
}

export function isTauriRuntime() {
  return Boolean(resolveInvoke());
}

export async function getWidgetPreferences() {
  const fallback = readLocalPreferenceFallback();
  const result = await invokeOrFallback("get_widget_preferences", {}, fallback);
  return normalizeWidgetPreferences(result);
}

export async function saveWidgetPreferences(preferences) {
  const normalized = writeLocalPreferenceFallback({
    ...preferences,
    updatedAt: new Date().toISOString()
  });
  const invoke = resolveInvoke();
  if (invoke) {
    await invoke("save_widget_preferences", { preferences: normalized });
  }
  return normalized;
}

export async function showWidgetWindow() {
  await invokeOrFallback("show_widget_window", {}, { ok: true });
}

export async function hideWidgetWindow() {
  await invokeOrFallback("hide_widget_window", {}, { ok: true });
}

export async function openMainWindow() {
  await invokeOrFallback("open_main_window", {}, { ok: true });
}

export async function setWidgetTopmost(value) {
  await invokeOrFallback("set_widget_topmost", { value: Boolean(value) }, { ok: true });
}

export async function setWidgetCollapsed(value) {
  await invokeOrFallback("set_widget_collapsed", { value: Boolean(value) }, { ok: true });
}

export async function startWidgetDragging() {
  await invokeOrFallback("start_widget_dragging", {}, { ok: true });
}

export async function saveWidgetWindowPosition() {
  await invokeOrFallback("save_widget_window_position", {}, { ok: true });
}

export async function minimizeMainWindow() {
  await invokeOrFallback("minimize_main_window", {}, { ok: true });
}

export async function toggleMainWindowMaximized() {
  await invokeOrFallback("toggle_main_window_maximized", {}, { ok: true });
}

export async function closeMainWindowToTray() {
  await invokeOrFallback("close_main_window_to_tray", {}, { ok: true });
}

export async function startMainWindowDragging() {
  await invokeOrFallback("start_main_window_dragging", {}, { ok: true });
}
