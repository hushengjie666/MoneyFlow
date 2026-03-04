import fs from "node:fs";
import path from "node:path";

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(",");
  const scoreIndex = header.indexOf("overall_score");
  if (scoreIndex === -1) throw new Error("CSV must include overall_score column.");

  const scores = [];
  let blankRows = 0;
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const value = cols[scoreIndex]?.trim();
    if (!value) {
      blankRows += 1;
      continue;
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error(`Invalid overall_score: "${value}"`);
    }
    scores.push(n);
  }
  return { scores, blankRows };
}

function summarize(scores) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of scores) dist[s] += 1;
  const n = scores.length;
  const clearCount = dist[4] + dist[5];
  const clearRatio = n === 0 ? 0 : clearCount / n;
  const pass = n >= 20 && clearRatio >= 0.85;
  return { n, dist, clearRatio, pass };
}

function recordBlock(summary) {
  const date = new Date().toISOString().slice(0, 10);
  return [
    "## 11. SC-005 Execution Record",
    "",
    `执行日期：${date}  `,
    `样本数（n）：${summary.n}  `,
    `评分分布（1/2/3/4/5）：${summary.dist[1]}/${summary.dist[2]}/${summary.dist[3]}/${summary.dist[4]}/${summary.dist[5]}  `,
    `\`clear_ratio\`：${summary.clearRatio.toFixed(4)}  `,
    `结论（PASS/FAIL）：${summary.pass ? "PASS" : "FAIL"}  `,
    "备注：此项需要真实用户参与，不能由自动化测试替代。",
    ""
  ].join("\n");
}

function replaceExecutionRecord(quickstartPath, newBlock) {
  const content = fs.readFileSync(quickstartPath, "utf8");
  const start = content.indexOf("## 11. SC-005 Execution Record");
  const next = content.indexOf("\nSC-005 统计命令", start);
  if (start === -1 || next === -1) {
    throw new Error("Cannot locate SC-005 Execution Record block in quickstart.md");
  }
  const updated = content.slice(0, start) + newBlock + content.slice(next);
  fs.writeFileSync(quickstartPath, updated, "utf8");
}

const csvArg = process.argv[2] || "specs/001-fund-flow-tracker/usability-survey-template.csv";
const apply = process.argv.includes("--apply");
const csvPath = path.resolve(process.cwd(), csvArg);
const quickstartPath = path.resolve(process.cwd(), "specs/001-fund-flow-tracker/quickstart.md");

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

const { scores, blankRows } = parseCsv(csvPath);
const summary = summarize(scores);
const block = recordBlock(summary);

console.log(
  JSON.stringify(
    {
      sampleSize: summary.n,
      blankRows,
      distribution: summary.dist,
      clearRatio: Number(summary.clearRatio.toFixed(4)),
      pass: summary.pass
    },
    null,
    2
  )
);

if (apply) {
  if (blankRows > 0) {
    console.error("Cannot apply: some rows have empty overall_score.");
    process.exit(1);
  }
  if (summary.n < 20) {
    console.error("Cannot apply: sampleSize must be >= 20.");
    process.exit(1);
  }
  replaceExecutionRecord(quickstartPath, block);
  console.log(`Updated: ${quickstartPath}`);
}
