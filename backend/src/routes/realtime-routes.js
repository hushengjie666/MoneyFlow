import { sendJson } from "../lib/http.js";
import { computeBalanceTick } from "../services/balance-service.js";

export function createRealtimeRoutes({ snapshotRepository, eventRepository }) {
  return async function handleRealtime(req, res, url) {
    if (url.pathname !== "/api/realtime-balance") return false;
    if (req.method !== "GET") return false;

    const snapshot =
      snapshotRepository.getSnapshot() ?? {
        initialBalanceYuan: 0,
        currentBalanceYuan: 0,
        timezone: "Asia/Shanghai",
        updatedAt: new Date().toISOString()
      };
    const tick = computeBalanceTick({
      initialBalanceYuan: snapshot.initialBalanceYuan,
      events: eventRepository.listForBalance(),
      now: new Date()
    });
    sendJson(res, 200, tick);
    return true;
  };
}
