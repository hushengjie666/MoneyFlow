import { getRealtimeBalance } from "./api-client.js";

export function startBalancePolling({ onTick, onError, intervalMs = 1000 }) {
  let timer = null;
  let active = true;

  async function loop() {
    if (!active) return;
    try {
      const tick = await getRealtimeBalance();
      onTick(tick);
    } catch (error) {
      onError(error);
    } finally {
      if (active) {
        timer = setTimeout(loop, intervalMs);
      }
    }
  }

  loop();
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}
