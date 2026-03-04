import { readJson, sendError, sendJson } from "../lib/http.js";
import { validateSnapshotPayload } from "../lib/validators.js";

export function createSnapshotRoutes({ snapshotService }) {
  return async function handleSnapshot(req, res) {
    if (req.method === "GET") {
      const snapshot = snapshotService.getSnapshot();
      sendJson(res, 200, snapshot);
      return true;
    }
    if (req.method === "PUT") {
      try {
        const payload = await readJson(req);
        const validationError = validateSnapshotPayload(payload);
        if (validationError) {
          sendError(res, 400, validationError);
          return true;
        }
        const snapshot = snapshotService.setInitialBalance(payload.initialBalanceYuan, "Asia/Shanghai");
        sendJson(res, 200, snapshot);
        return true;
      } catch (error) {
        sendError(res, 400, error.message);
        return true;
      }
    }
    return false;
  };
}
