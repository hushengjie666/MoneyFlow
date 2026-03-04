import { sendJson } from "../lib/http.js";

export function createLocalDataRoutes({ eventRepository, snapshotRepository }) {
  return async function handleLocalData(req, res, url) {
    if (url.pathname !== "/api/local-data") return false;
    if (req.method !== "DELETE") return false;

    const nowIso = new Date().toISOString();
    eventRepository.clearAllEvents();
    snapshotRepository.upsertSnapshot({
      initialBalanceYuan: 0,
      currentBalanceYuan: 0,
      timezone: "Asia/Shanghai",
      updatedAt: nowIso
    });
    sendJson(res, 200, { cleared: true, updatedAt: nowIso });
    return true;
  };
}
