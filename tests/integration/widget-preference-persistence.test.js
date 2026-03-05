import { beforeEach, describe, expect, it } from "vitest";
import { getWidgetPreferences, saveWidgetPreferences } from "../../frontend/src/widget/widget-bridge.js";

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

describe("widget preference persistence", () => {
  beforeEach(() => {
    global.window = {};
    global.localStorage = createLocalStorageMock();
  });

  it("persists preferences and restores them on next read", async () => {
    await saveWidgetPreferences({
      x: 120,
      y: 66,
      opacity: 0.8,
      startupMode: "auto",
      alwaysOnTop: true
    });

    const restored = await getWidgetPreferences();
    expect(restored.x).toBe(120);
    expect(restored.y).toBe(66);
    expect(restored.opacity).toBe(0.8);
    expect(restored.startupMode).toBe("auto");
    expect(restored.alwaysOnTop).toBe(true);
  });
});

