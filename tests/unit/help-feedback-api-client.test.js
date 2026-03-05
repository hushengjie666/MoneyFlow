import { afterEach, describe, expect, it, vi } from "vitest";
import { submitHelpFeedback } from "../../frontend/src/api-client.js";

describe("help feedback api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try {
      delete globalThis.window;
    } catch {
      // ignore
    }
  });

  it("throws when both feedback fields are empty", async () => {
    await expect(
      submitHelpFeedback({
        issueFeedback: "",
        featureExpectation: "",
        contact: "wx-001"
      })
    ).rejects.toThrow("请至少填写“系统问题反馈”或“期望功能开发”其中一项");
  });

  it("allows empty contact", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, id: "ok-1" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitHelpFeedback({
        issueFeedback: "页面偶发闪退",
        featureExpectation: "",
        contact: ""
      })
    ).resolves.toMatchObject({ ok: true });
  });

  it("rejects risky content", async () => {
    await expect(
      submitHelpFeedback({
        issueFeedback: "<script>alert(1)</script>",
        featureExpectation: "",
        contact: "abc"
      })
    ).rejects.toThrow("反馈内容包含不安全字符");
  });

  it("posts payload to feedback endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, id: "20260306-001", filename: "20260306-001.md" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitHelpFeedback({
      issueFeedback: "列表偶发为空",
      featureExpectation: "希望支持导出",
      contact: "test@example.com"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://94.191.82.58:38127/feedback");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-Feedback-Token"]).toBe("duyu346327yd63g343");
    const body = JSON.parse(options.body);
    expect(body.title).toContain("问题");
    expect(body.content).toContain("列表偶发为空");
    expect(body.content).toContain("希望支持导出");
    expect(body.extra.issueFeedback).toBe("列表偶发为空");
    expect(body.extra.featureExpectation).toBe("希望支持导出");
    expect(body.contact).toBe("test@example.com");
    expect(result.ok).toBe(true);
  });

  it("throws server error text when service rejects", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        ok: false,
        error: "invalid token"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitHelpFeedback({
        issueFeedback: "提交失败",
        featureExpectation: "",
        contact: "test@example.com"
      })
    ).rejects.toThrow("invalid token");
  });

  it("prefers tauri invoke proxy when runtime is available", async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      ok: true,
      id: "20260306-abc",
      filename: "20260306-abc.md"
    });
    globalThis.window = {
      __TAURI__: {
        core: {
          invoke: invokeMock
        }
      }
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitHelpFeedback({
      issueFeedback: "提交失败",
      featureExpectation: "增加导出",
      contact: "wx-123"
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [command, args] = invokeMock.mock.calls[0];
    expect(command).toBe("submit_feedback_proxy");
    expect(args.payload.contact).toBe("wx-123");
    expect(args.payload.content).toContain("提交失败");
    expect(args.payload.content).toContain("增加导出");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
