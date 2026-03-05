import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("help feedback flow", () => {
  it("adds help menu and help panel feedback form", () => {
    const htmlPath = path.resolve("frontend/index.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('data-target="helpPanel"');
    expect(html).toContain('id="helpPanel"');
    expect(html).toContain('id="helpFeedbackForm"');
    expect(html).toContain('id="issueFeedback"');
    expect(html).toContain('id="featureExpectation"');
    expect(html).toContain('id="helpContactStage"');
    expect(html).toContain('id="feedbackContact"');
    expect(html).toContain('id="helpFeedbackStartBtn"');
    expect(html).toContain('id="helpFeedbackStatus"');
    expect(html).toContain("联系方式（选填）");
    expect(html).toContain("感谢反馈！如愿意接收处理结果，可留下联系方式。");
    expect(html).toContain('id="helpSupportEmailBtn"');
    expect(html).toContain("835823869@qq.com");
    expect(html).toContain('id="statusText"');
  });

  it("wires optional-contact help submission and email copy", () => {
    const jsPath = path.resolve("frontend/src/main.js");
    const js = fs.readFileSync(jsPath, "utf8");

    expect(js).toContain("submitHelpFeedback");
    expect(js).toContain("setHelpFeedbackStatus");
    expect(js).toContain("validateHelpFeedbackInput");
    expect(js).toContain("lastHelpSubmitAt");
    expect(js).toContain("copySupportEmail");
    expect(js).toContain('helpSupportEmailBtn?.addEventListener("pointerdown"');
    expect(js).toContain("submitHelpFeedbackFlow");
    expect(js).toContain("提交成功！感谢你的反馈与建议，我们会认真评估并持续改进产品。");
    expect(js).toContain('setStatus("邮箱已复制", "success")');
  });
});
