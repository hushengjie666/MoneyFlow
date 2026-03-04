import { readJson, sendError, sendJson } from "../lib/http.js";
import { validateEventCreatePayload, validateEventPatchPayload } from "../lib/validators.js";

export function createEventRoutes({ eventService }) {
  return async function handleEvents(req, res, url) {
    if (url.pathname === "/api/events") {
      if (req.method === "GET") {
        const status = url.searchParams.get("status") ?? undefined;
        const events = eventService.listEvents(status);
        sendJson(res, 200, events);
        return true;
      }
      if (req.method === "POST") {
        try {
          const payload = await readJson(req);
          const validationError = validateEventCreatePayload(payload);
          if (validationError) {
            sendError(res, 400, validationError);
            return true;
          }
          const event = eventService.createEvent(payload);
          sendJson(res, 201, event);
          return true;
        } catch (error) {
          sendError(res, 400, error.message);
          return true;
        }
      }
      return false;
    }

    const eventIdMatch = url.pathname.match(/^\/api\/events\/(\d+)$/);
    if (eventIdMatch) {
      if (req.method !== "PATCH") {
        return false;
      }
      try {
        const payload = await readJson(req);
        const validationError = validateEventPatchPayload(payload);
        if (validationError) {
          sendError(res, 400, validationError);
          return true;
        }
        const id = Number(eventIdMatch[1]);
        const event = eventService.updateEvent(id, payload);
        if (!event) {
          sendError(res, 404, "event not found");
          return true;
        }
        sendJson(res, 200, event);
        return true;
      } catch (error) {
        sendError(res, 400, error.message);
        return true;
      }
    }

    return false;
  };
}
