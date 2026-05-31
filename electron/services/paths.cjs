const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function expandEnv(input) {
  if (!input) return input;
  return String(input).replace(/%([^%]+)%/g, (_, name) => process.env[name] || `%${name}%`);
}

function defaultCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function readDevLocalPath() {
  const localPath = path.join(process.cwd(), "config", "local.paths.json");
  if (!fs.existsSync(localPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(localPath, "utf8"));
    return parsed.codexHome ? path.resolve(expandEnv(parsed.codexHome)) : null;
  } catch {
    return null;
  }
}

function readPreferences(userDataPath) {
  const prefsPath = path.join(userDataPath, "preferences.json");
  if (!fs.existsSync(prefsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(prefsPath, "utf8"));
  } catch {
    return {};
  }
}

function writePreferences(userDataPath, prefs) {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDataPath, "preferences.json"),
    JSON.stringify(prefs, null, 2),
    "utf8"
  );
}

function resolveCodexHome(userDataPath) {
  const prefs = userDataPath ? readPreferences(userDataPath) : {};
  const configured = prefs.codexHome || readDevLocalPath() || defaultCodexHome();
  return path.resolve(expandEnv(configured));
}

module.exports = {
  defaultCodexHome,
  expandEnv,
  readPreferences,
  resolveCodexHome,
  writePreferences
};
