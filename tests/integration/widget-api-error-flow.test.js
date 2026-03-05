import { describe, expect, it } from "vitest";
import {
  applyWidgetError,
  createInitialWidgetRuntimeState,
  WIDGET_VIEW_STATE
} from "../../frontend/src/widget/widget-state.js";

describe("widget api error flow", () => {
  it("turns runtime state to error when upstream request fails", async () => {
    let networkError;
    try {
      await fetch("http://127.0.0.1:1/api/realtime-balance");
    } catch (error) {
      networkError = error;
    }
    expect(networkError).toBeTruthy();

    const state = createInitialWidgetRuntimeState();
    const next = applyWidgetError(state, networkError);
    expect(next.connectionState).toBe(WIDGET_VIEW_STATE.ERROR);
    expect(next.errorCode).toBe("WIDGET_RUNTIME_ERROR");
  });
});

