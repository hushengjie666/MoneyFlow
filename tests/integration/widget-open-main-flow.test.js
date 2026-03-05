import { beforeEach, describe, expect, it, vi } from "vitest";
import { openMainWindow } from "../../frontend/src/widget/widget-bridge.js";

describe("widget open main flow", () => {
  beforeEach(() => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    global.window = {
      __TAURI__: {
        core: {
          invoke
        }
      }
    };
  });

  it("invokes tauri open_main_window command", async () => {
    await openMainWindow();
    expect(global.window.__TAURI__.core.invoke).toHaveBeenCalledWith("open_main_window", {});
  });
});

