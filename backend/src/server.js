import http from "node:http";
import { db } from "./db.js";
import { createSnapshotRepository } from "./repositories/snapshot-repository.js";
import { createEventRepository } from "./repositories/event-repository.js";
import { createSnapshotService } from "./services/snapshot-service.js";
import { createEventService } from "./services/event-service.js";
import { createSnapshotRoutes } from "./routes/snapshot-routes.js";
import { createEventRoutes } from "./routes/event-routes.js";
import { createRealtimeRoutes } from "./routes/realtime-routes.js";
import { createLocalDataRoutes } from "./routes/local-data-routes.js";
import { createApiRouter } from "./routes/index.js";
import { sendError } from "./lib/http.js";
import { fileURLToPath } from "node:url";

export function createServer({ database = db } = {}) {
  const snapshotRepository = createSnapshotRepository(database);
  const eventRepository = createEventRepository(database);
  const snapshotService = createSnapshotService({
    snapshotRepository,
    eventRepository
  });
  const eventService = createEventService({
    eventRepository,
    snapshotService
  });

  const snapshotRoutes = createSnapshotRoutes({ snapshotService });
  const eventRoutes = createEventRoutes({ eventService });
  const realtimeRoutes = createRealtimeRoutes({ snapshotRepository, eventRepository });
  const localDataRoutes = createLocalDataRoutes({ snapshotRepository, eventRepository });
  const apiRouter = createApiRouter({ snapshotRoutes, eventRoutes, realtimeRoutes, localDataRoutes });

  return http.createServer(async (req, res) => {
    try {
      await apiRouter(req, res);
    } catch (error) {
      sendError(res, 500, "internal server error", error.message);
    }
  });
}

const thisFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && thisFilePath === process.argv[1]) {
  const port = Number(process.env.PORT ?? 8787);
  const server = createServer();
  server.listen(port, () => {
    console.log(`[moneyflow-api] listening on http://localhost:${port}`);
  });
}
