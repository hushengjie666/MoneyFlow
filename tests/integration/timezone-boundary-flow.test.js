import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "./test-server.js";

const useServer = registerCleanup(createTestServer);

describe("timezone boundary flow", () => {
  let baseUrl;
  beforeEach(async () => {
    ({ baseUrl } = await useServer());
  });

  it("stores and returns Asia/Shanghai timezone in snapshot", async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 1000 })
    });
    const snapshot = await (await fetch(`${baseUrl}/api/snapshot`)).json();
    expect(snapshot.timezone).toBe("Asia/Shanghai");
  });
});
