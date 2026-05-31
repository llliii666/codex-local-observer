const fs = require("node:fs");
const path = require("node:path");

function normalizePath(inputPath) {
  return path.resolve(String(inputPath || ""));
}

function isWithin(parent, child) {
  const parentPath = normalizePath(parent).toLowerCase();
  const childPath = normalizePath(child).toLowerCase();
  return childPath === parentPath || childPath.startsWith(`${parentPath}${path.sep}`);
}

function statSafe(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function readTextSafe(targetPath, maxBytes = 1024 * 1024) {
  const stat = statSafe(targetPath);
  if (!stat || !stat.isFile()) return "";
  const fd = fs.openSync(targetPath, "r");
  try {
    const size = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function parseJsonLines(text, limit = 500) {
  const rows = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
      if (rows.length >= limit) break;
    } catch {
      rows.push({ type: "parse_error", raw: line.slice(0, 300) });
    }
  }
  return rows;
}

function walkFiles(root, options = {}) {
  const limit = options.limit ?? 5000;
  const maxDepth = options.maxDepth ?? 8;
  const include = options.include;
  const out = [];
  const rootPath = normalizePath(root);
  if (!fs.existsSync(rootPath)) return out;

  function visit(dir, depth) {
    if (out.length >= limit || depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= limit) break;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath, depth + 1);
      } else if (!include || include(fullPath)) {
        const stat = statSafe(fullPath);
        if (stat) out.push({ fullPath, stat });
      }
    }
  }

  visit(rootPath, 0);
  return out;
}

function dirSummary(root, relativeDir) {
  const dirPath = path.join(root, relativeDir);
  const files = walkFiles(dirPath, { limit: 10000, maxDepth: 10 });
  const size = files.reduce((sum, file) => sum + file.stat.size, 0);
  const last = files
    .map((file) => file.stat.mtimeMs)
    .sort((a, b) => b - a)[0];
  return {
    name: relativeDir,
    exists: Boolean(statSafe(dirPath)),
    files: files.length,
    size,
    lastWrite: last ? new Date(last).toISOString() : null
  };
}

module.exports = {
  dirSummary,
  isWithin,
  normalizePath,
  parseJsonLines,
  readTextSafe,
  statSafe,
  walkFiles
};
