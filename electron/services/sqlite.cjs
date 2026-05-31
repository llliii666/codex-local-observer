const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

function queryWithNodeSqlite(dbPath, sql) {
  let sqlite;
  try {
    sqlite = require("node:sqlite");
  } catch {
    return { ok: false, reason: "node:sqlite unavailable" };
  }
  try {
    const db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
    try {
      const rows = db.prepare(sql).all();
      return { ok: true, adapter: "node:sqlite", rows };
    } finally {
      db.close();
    }
  } catch (error) {
    return { ok: false, adapter: "node:sqlite", reason: error.message };
  }
}

function queryWithCli(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 8000
  });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      adapter: "sqlite3",
      reason: result.error?.message || result.stderr || `exit ${result.status}`
    };
  }
  try {
    return {
      ok: true,
      adapter: "sqlite3",
      rows: result.stdout.trim() ? JSON.parse(result.stdout) : []
    };
  } catch (error) {
    return { ok: false, adapter: "sqlite3", reason: error.message };
  }
}

function querySqlite(dbPath, sql) {
  if (!fs.existsSync(dbPath)) {
    return { ok: false, reason: "database missing", rows: [] };
  }
  const nodeResult = queryWithNodeSqlite(dbPath, sql);
  if (nodeResult.ok) return nodeResult;
  const cliResult = queryWithCli(dbPath, sql);
  if (cliResult.ok) return cliResult;
  return {
    ok: false,
    rows: [],
    reason: `${nodeResult.reason}; ${cliResult.reason}`
  };
}

function tableCount(dbPath, table) {
  const result = querySqlite(dbPath, `select count(*) as count from ${table};`);
  return result.ok ? Number(result.rows[0]?.count || 0) : null;
}

module.exports = {
  querySqlite,
  tableCount
};
