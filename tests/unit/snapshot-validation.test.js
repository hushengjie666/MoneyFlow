import { describe, expect, it } from "vitest";
import { validateSnapshotPayload } from "../../backend/src/lib/validators.js";

describe("snapshot validation", () => {
  it("rejects empty payload", () => {
    expect(validateSnapshotPayload(null)).toContain("payload");
  });

  it("rejects forbidden identity fields", () => {
    expect(validateSnapshotPayload({ initialBalanceYuan: 1, userId: "u1" })).toContain(
      "single-user model"
    );
  });

  it("accepts valid boundary values", () => {
    expect(validateSnapshotPayload({ initialBalanceYuan: -1000000000 })).toBeNull();
    expect(validateSnapshotPayload({ initialBalanceYuan: 1000000000 })).toBeNull();
    expect(validateSnapshotPayload({ initialBalanceYuan: 1234.56 })).toBeNull();
  });

  it("rejects more than 2 decimal places", () => {
    expect(validateSnapshotPayload({ initialBalanceYuan: 1.234 })).toContain("2 decimal");
  });
});
