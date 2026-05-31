const path = require("node:path");
const collector = require("../electron/services/codex-collector.cjs");

function main() {
  const userDataPath = process.cwd();
  const health = collector.getHealth(userDataPath);
  const overview = collector.getOverview(userDataPath);
  const checks = [];

  checks.push(["Codex home", health.exists, health.codexHome]);
  checks.push(["config.toml", Boolean(health.files["config.toml"]?.exists), "settings source"]);
  checks.push(["sessions/", overview.directories.some((dir) => dir.name === "sessions" && dir.exists), "active sessions"]);
  checks.push(["memories/", overview.directories.some((dir) => dir.name === "memories" && dir.exists), "memory files"]);
  checks.push(["skills/", overview.directories.some((dir) => dir.name === "skills" && dir.exists), "skills"]);
  checks.push(["plugins/", overview.directories.some((dir) => dir.name === "plugins" && dir.exists), "plugin cache"]);

  console.log("Codex Local Observer doctor");
  console.log(`Codex home: ${health.codexHome}`);
  console.log("");
  for (const [name, ok, note] of checks) {
    console.log(`${ok ? "PASS" : "MISS"} ${name} ${note ? `- ${note}` : ""}`);
  }
  console.log("");
  console.log("SQLite:");
  for (const [name, item] of Object.entries(health.sqlite)) {
    console.log(`${item.ok ? "PASS" : "MISS"} ${name} rows=${item.rows ?? "-"} adapter=${item.adapter || "-"}`);
  }
  console.log("");
  console.log("Inventory:");
  for (const dir of overview.directories) {
    console.log(`${dir.name.padEnd(18)} files=${String(dir.files).padStart(5)} size=${dir.size}`);
  }

  if (!health.exists) {
    console.error("\nCodex home is missing. Set CODEX_HOME or create config/local.paths.json.");
    process.exit(1);
  }
}

main();
