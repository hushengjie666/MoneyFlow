import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "../../backend/src/db.js";
import { createServer } from "../../backend/src/server.js";

async function boot(dbPath) {
  const db = createDb(dbPath);
  const server = createServer({ database: db });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    }
  };
}

const cleanups = [];
afterEach(async () => {
  while (cleanups.length) {
    const cleanup = cleanups.pop();
    await cleanup();
  }
});

describe("e2e full user journey", () => {
  it(
    "supports full flow with persistence across server restart",
    async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "moneyflow-e2e-"));
    const dbPath = path.join(tempDir, "moneyflow.e2e.db");

    const app1 = await boot(dbPath);
    cleanups.push(async () => {
      await app1.close();
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Windows may keep sqlite side files briefly locked; best-effort cleanup is enough for CI.
      }
    });

    const nowMinus2m = new Date(Date.now() - 120_000).toISOString();
    const nowMinus5m = new Date(Date.now() - 300_000).toISOString();

    const snapshotRes = await fetch(`${app1.baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 100000 })
    });
    expect(snapshotRes.status).toBe(200);

    const oneTimeRes = await fetch(`${app1.baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "早餐支出",
        eventKind: "one_time",
        direction: "outflow",
        amountYuan: 5000,
        effectiveAt: nowMinus2m
      })
    });
    expect(oneTimeRes.status).toBe(201);

    const recurringRes = await fetch(`${app1.baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "日薪入账",
        eventKind: "recurring",
        direction: "inflow",
        amountYuan: 86400,
        effectiveAt: nowMinus5m,
        recurrenceUnit: "day",
        recurrenceInterval: 1
      })
    });
    expect(recurringRes.status).toBe(201);
    const recurring = await recurringRes.json();

    const tick1 = await (await fetch(`${app1.baseUrl}/api/realtime-balance`)).json();
    expect(tick1.displayBalanceYuan).toBeGreaterThan(95000);
    expect(tick1.sourceSummary.activeRecurringCount).toBe(1);

    const delRes = await fetch(`${app1.baseUrl}/api/events/${recurring.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deleted" })
    });
    expect(delRes.status).toBe(200);

    const tick2 = await (await fetch(`${app1.baseUrl}/api/realtime-balance`)).json();
    expect(tick2.displayBalanceYuan).toBe(95000);

    await app1.close();

    const app2 = await boot(dbPath);
    cleanups.push(app2.close);
    const persistedSnapshot = await (await fetch(`${app2.baseUrl}/api/snapshot`)).json();
    expect(persistedSnapshot.currentBalanceYuan).toBe(95000);

    const deletedEvents = await (
      await fetch(`${app2.baseUrl}/api/events?status=deleted`)
    ).json();
    expect(deletedEvents.length).toBe(1);
    },
    20000
  );
});
