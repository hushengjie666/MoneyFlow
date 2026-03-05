import { describe, expect, it } from "vitest";
import {
  WIDGET_VIEW_STATE,
  applyWidgetError,
  applyWidgetTick,
  createInitialWidgetRuntimeState,
  normalizeWidgetPreferences
} from "../../frontend/src/widget/widget-state.js";

describe("widget state", () => {
  it("enters ready state when tick contains numeric balance", () => {
    const initial = createInitialWidgetRuntimeState();
    const next = applyWidgetTick(initial, {
      timestamp: "2026-03-04T00:00:00.000Z",
      displayBalanceYuan: 123.45,
      flowPerSecondYuan: 0.12
    });
    expect(next.connectionState).toBe(WIDGET_VIEW_STATE.READY);
    expect(next.displayBalanceYuan).toBe(123.45);
    expect(next.flowPerSecondYuan).toBe(0.12);
  });

  it("enters error state with mapped message when polling fails", () => {
    const initial = createInitialWidgetRuntimeState();
    const next = applyWidgetError(initial, new Error("network down"));
    expect(next.connectionState).toBe(WIDGET_VIEW_STATE.ERROR);
    expect(next.errorCode).toBe("WIDGET_RUNTIME_ERROR");
    expect(next.errorMessage).toContain("network down");
  });

  it("normalizes widget preferences bounds and startup mode", () => {
    const prefs = normalizeWidgetPreferences({
      opacity: 2,
      width: 100,
      height: 40,
      startupMode: "invalid",
      alwaysOnTop: 1
    });
    expect(prefs.opacity).toBe(1);
    expect(prefs.width).toBe(220);
    expect(prefs.height).toBe(72);
    expect(prefs.startupMode).toBe("manual");
    expect(prefs.alwaysOnTop).toBe(true);
    expect(prefs.allowSimultaneousDisplay).toBe(false);
  });
});
