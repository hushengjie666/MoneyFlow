import { beforeEach, describe, expect, it } from "vitest";
import { createTestServer, registerCleanup } from "../integration/test-server.js";

const useServer = registerCleanup(createTestServer);

describe("snapshot contract", () => {
  let baseUrl;

  beforeEach(async () => {
    const server = await useServer();
    baseUrl = server.baseUrl;
  });

  it("supports GET and PUT /api/snapshot", async () => {
    const putRes = await fetch(`${baseUrl}/api/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalanceYuan: 12345 })
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody).toMatchObject({
      initialBalanceYuan: 12345
    });

    const getRes = await fetch(`${baseUrl}/api/snapshot`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody).toHaveProperty("currentBalanceYuan");
    expect(getBody).toHaveProperty("timezone", "Asia/Shanghai");
  });
});
