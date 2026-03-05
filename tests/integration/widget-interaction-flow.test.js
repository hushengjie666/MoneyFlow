import { beforeEach, describe, expect, it } from "vitest";
import {
  getWidgetPreferences,
  hideWidgetWindow,
  openMainWindow,
  saveWidgetPreferences,
  setWidgetCollapsed,
  setWidgetTopmost,
  showWidgetWindow
} from "../../frontend/src/widget/widget-bridge.js";

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

describe("widget interaction flow", () => {
  beforeEach(() => {
    global.window = {};
    global.localStorage = createLocalStorageMock();
  });

  it("supports fallback interaction calls without tauri runtime", async () => {
    const saved = await saveWidgetPreferences({
      startupMode: "auto",
      alwaysOnTop: true,
      opacity: 0.88
    });
    expect(saved.startupMode).toBe("auto");
    expect(saved.alwaysOnTop).toBe(true);

    const loaded = await getWidgetPreferences();
    expect(loaded.opacity).toBe(0.88);

    await expect(setWidgetTopmost(true)).resolves.toBeUndefined();
    await expect(setWidgetCollapsed(true)).resolves.toBeUndefined();
    await expect(showWidgetWindow()).resolves.toBeUndefined();
    await expect(hideWidgetWindow()).resolves.toBeUndefined();
    await expect(openMainWindow()).resolves.toBeUndefined();
  });
});

