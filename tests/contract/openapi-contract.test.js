import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("openapi baseline", () => {
  it("contains required endpoints", () => {
    const contractPath = path.resolve("specs/001-fund-flow-tracker/contracts/openapi.yaml");
    const content = fs.readFileSync(contractPath, "utf8");

    expect(content).toContain("/api/snapshot");
    expect(content).toContain("/api/events");
    expect(content).toContain("/api/events/{id}");
    expect(content).toContain("/api/realtime-balance");
  });
});
