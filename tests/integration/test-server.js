import { afterEach } from "vitest";
import { createDb } from "../../backend/src/db.js";
import { createServer } from "../../backend/src/server.js";

export async function createTestServer() {
  const db = createDb(":memory:");
  const server = createServer({ database: db });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const cleanup = async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  };

  return { baseUrl, cleanup };
}

export function registerCleanup(cleanupFactory) {
  const cleanups = [];
  afterEach(async () => {
    while (cleanups.length) {
      const cleanup = cleanups.pop();
      await cleanup();
    }
  });
  return async () => {
    const resource = await cleanupFactory();
    cleanups.push(resource.cleanup);
    return resource;
  };
}
