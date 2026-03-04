import { methodNotAllowed, notFound, sendJson } from "../lib/http.js";

export function createApiRouter({ snapshotRoutes, eventRoutes, realtimeRoutes }) {
  return async function apiRouter(req, res) {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/snapshot") {
      const handled = await snapshotRoutes(req, res, url);
      if (!handled) methodNotAllowed(res, ["GET", "PUT"]);
      return;
    }

    if (url.pathname === "/api/events" || /^\/api\/events\/\d+$/.test(url.pathname)) {
      const handled = await eventRoutes(req, res, url);
      if (!handled) {
        if (url.pathname === "/api/events") methodNotAllowed(res, ["GET", "POST"]);
        else methodNotAllowed(res, ["PATCH"]);
      }
      return;
    }

    if (url.pathname === "/api/realtime-balance") {
      const handled = await realtimeRoutes(req, res, url);
      if (!handled) methodNotAllowed(res, ["GET"]);
      return;
    }

    notFound(res);
  };
}
