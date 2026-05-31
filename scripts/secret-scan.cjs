const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const skipDirs = new Set([".git", "node_modules", "dist", "release", "coverage", ".vite"]);
const sensitiveFileNames = new Set(["auth.json", "cap_sid"]);
const patterns = [
  { name: "OpenAI-style API key", regex: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: "Bearer token", regex: /Bearer\s+[A-Za-z0-9._-]{24,}/ },
  { name: "Private Windows Codex path", regex: /C:\\Users\\[^\\\r\n]+\\\.codex/i }
];
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const rel = path.relative(root, fullPath);
    if (sensitiveFileNames.has(entry.name.toLowerCase())) {
      findings.push(`${rel}: forbidden sensitive file name`);
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > 1024 * 1024) continue;
    const text = fs.readFileSync(fullPath, "utf8");
    for (const pattern of patterns) {
      if (pattern.regex.test(text)) findings.push(`${rel}: ${pattern.name}`);
    }
  }
}

walk(root);

if (findings.length) {
  console.error("Secret scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret scan passed.");
