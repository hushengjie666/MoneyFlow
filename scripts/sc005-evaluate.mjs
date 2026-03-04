import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "specs/001-fund-flow-tracker/usability-survey-template.csv";
const absolutePath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, "utf8").trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
  console.error("CSV has no data rows.");
  process.exit(1);
}

const header = lines[0].split(",");
const scoreIndex = header.indexOf("overall_score");
if (scoreIndex === -1) {
  console.error("CSV must include overall_score column.");
  process.exit(1);
}

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
    console.error(`Invalid overall_score: "${value}"`);
    process.exit(1);
  }
  scores.push(n);
}

const n = scores.length;
const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const s of scores) dist[s] += 1;

const clearCount = dist[4] + dist[5];
const clearRatio = n === 0 ? 0 : clearCount / n;
const pass = n >= 20 && clearRatio >= 0.85;

console.log(JSON.stringify({
  sampleSize: n,
  blankRows,
  distribution: dist,
  clearRatio: Number(clearRatio.toFixed(4)),
  threshold: 0.85,
  minSample: 20,
  pass
}, null, 2));
