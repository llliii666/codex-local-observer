const fs = require("node:fs");
const path = require("node:path");
const { dirSummary, isWithin, parseJsonLines, readTextSafe, statSafe, walkFiles } = require("./fs-utils.cjs");
const { resolveCodexHome, writePreferences } = require("./paths.cjs");
const { redactText, redactValue, truncate } = require("./redact.cjs");
const { querySqlite, tableCount } = require("./sqlite.cjs");

const DATA_DIRECTORIES = [
  "sessions",
  "archived_sessions",
  "memories",
  "skills",
  "plugins",
  "cache",
  "agents",
  "prompts",
  "rules",
  "automations",
  "browser",
  "generated_images",
  "computer-use"
];

const IMPORTANT_FILES = [
  "config.toml",
  "AGENTS.md",
  "hooks.json",
  "session_index.jsonl",
  "state_5.sqlite",
  "logs_2.sqlite",
  "memories_1.sqlite",
  "goals_1.sqlite",
  "auth.json"
];

function getCodexHome(userDataPath) {
  return resolveCodexHome(userDataPath);
}

function saveCodexHome(userDataPath, codexHome) {
  const resolved = path.resolve(codexHome);
  writePreferences(userDataPath, { codexHome: resolved });
  return resolved;
}

function fileMeta(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  const stat = statSafe(fullPath);
  return {
    name: relativePath,
    exists: Boolean(stat),
    size: stat?.size || 0,
    lastWrite: stat ? stat.mtime.toISOString() : null,
    readable: Boolean(stat)
  };
}

function getHealth(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const rootStat = statSafe(codexHome);
  const files = Object.fromEntries(IMPORTANT_FILES.map((name) => [name, fileMeta(codexHome, name)]));
  const sqlite = {
    state: sqliteHealth(path.join(codexHome, "state_5.sqlite"), "threads"),
    logs: sqliteHealth(path.join(codexHome, "logs_2.sqlite"), "logs"),
    memories: sqliteHealth(path.join(codexHome, "memories_1.sqlite"), "stage1_outputs"),
    goals: sqliteHealth(path.join(codexHome, "goals_1.sqlite"), "thread_goals")
  };
  return {
    codexHome,
    exists: Boolean(rootStat?.isDirectory()),
    readonly: true,
    redaction: "default",
    files,
    sqlite,
    timestamp: new Date().toISOString()
  };
}

function sqliteHealth(dbPath, table) {
  const stat = statSafe(dbPath);
  if (!stat) return { exists: false, ok: false, rows: null, adapter: null };
  const result = querySqlite(dbPath, `select count(*) as count from ${table};`);
  return {
    exists: true,
    ok: result.ok,
    rows: result.ok ? Number(result.rows[0]?.count || 0) : null,
    adapter: result.adapter || null,
    reason: result.ok ? null : result.reason,
    size: stat.size,
    lastWrite: stat.mtime.toISOString()
  };
}

function getOverview(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const directories = DATA_DIRECTORIES.map((name) => dirSummary(codexHome, name));
  const files = IMPORTANT_FILES.map((name) => fileMeta(codexHome, name));
  const settings = getSettings(userDataPath);
  return {
    health: getHealth(userDataPath),
    directories,
    files,
    model: settings.model,
    mcpCount: settings.mcpServers.length,
    pluginCount: settings.plugins.length,
    projectCount: settings.projects.length
  };
}

function parseTomlSummary(text) {
  const sections = [];
  const keys = [];
  let currentSection = "root";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[+(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections.push(currentSection);
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (keyMatch) {
      keys.push({
        section: currentSection,
        key: keyMatch[1],
        value: redactText(keyMatch[2], 220)
      });
    }
  }
  return { sections, keys };
}

function getSettings(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const configPath = path.join(codexHome, "config.toml");
  const text = readTextSafe(configPath, 1024 * 512);
  const parsed = parseTomlSummary(text);
  const keyMap = new Map(parsed.keys.map((item) => [`${item.section}.${item.key}`, item.value]));
  const model = {
    name: stripQuotes(keyMap.get("root.model") || ""),
    reasoningEffort: stripQuotes(keyMap.get("root.model_reasoning_effort") || ""),
    contextWindow: stripQuotes(keyMap.get("root.model_context_window") || ""),
    serviceTier: stripQuotes(keyMap.get("root.service_tier") || "")
  };
  return {
    codexHome,
    configExists: Boolean(statSafe(configPath)),
    model,
    sections: parsed.sections,
    keys: parsed.keys,
    projects: parsed.sections.filter((section) => section.startsWith("projects.")),
    mcpServers: parsed.sections.filter((section) => section.startsWith("mcp_servers.")),
    plugins: parsed.sections.filter((section) => section.startsWith("plugins.")),
    features: parsed.sections.filter((section) => section === "features" || section.startsWith("features.")),
    hooks: parsed.sections.filter((section) => section.startsWith("hooks.")),
    redactedPreview: redactText(text, 8000)
  };
}

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "");
}

function getSessions(userDataPath, query = "", limit = 100) {
  const codexHome = getCodexHome(userDataPath);
  const files = [
    ...walkFiles(path.join(codexHome, "sessions"), {
      include: (file) => file.endsWith(".jsonl"),
      limit: 2000,
      maxDepth: 6
    }).map((file) => ({ ...file, archived: false })),
    ...walkFiles(path.join(codexHome, "archived_sessions"), {
      include: (file) => file.endsWith(".jsonl"),
      limit: 2000,
      maxDepth: 2
    }).map((file) => ({ ...file, archived: true }))
  ];
  const normalizedQuery = String(query).trim().toLowerCase();
  return files
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .map((file) => summarizeSessionFile(file.fullPath, file.archived, codexHome, false))
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [item.title, item.cwd, item.model, item.id, item.preview]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .slice(0, limit);
}

function getSessionDetail(userDataPath, sessionPath) {
  const codexHome = getCodexHome(userDataPath);
  const fullPath = path.resolve(sessionPath);
  if (!isWithin(codexHome, fullPath)) {
    throw new Error("Session path is outside Codex home.");
  }
  return summarizeSessionFile(fullPath, fullPath.includes(`${path.sep}archived_sessions${path.sep}`), codexHome, true);
}

function summarizeSessionFile(fullPath, archived, codexHome, includeEvents) {
  const stat = statSafe(fullPath);
  const text = readTextSafe(fullPath, includeEvents ? 1024 * 1024 * 6 : 1024 * 512);
  const rows = parseJsonLines(text, includeEvents ? 5000 : 600);
  const meta = {};
  const events = [];
  let firstUser = "";
  let toolCalls = 0;
  let errors = 0;
  let tokens = 0;
  for (const row of rows) {
    const payload = row.payload || row;
    if (row.type === "session_meta" && payload) Object.assign(meta, payload);
    const flat = JSON.stringify(redactValue(row));
    if (!firstUser && /"role"\s*:\s*"user"|user_message|input_text/i.test(flat)) {
      firstUser = extractReadableText(row);
    }
    if (/tool_call|function_call|shell_command|apply_patch/i.test(flat)) toolCalls += 1;
    if (/"level"\s*:\s*"error"|error|failed/i.test(flat)) errors += 1;
    const tokenMatch = flat.match(/"tokens?_[a-z_]*"\s*:\s*(\d+)/gi) || [];
    for (const match of tokenMatch) tokens += Number(match.replace(/\D/g, "")) || 0;
    if (includeEvents) {
      events.push({
        timestamp: row.timestamp || payload.timestamp || null,
        type: row.type || payload.type || "event",
        summary: truncate(extractReadableText(row), 1000),
        raw: redactValue(row)
      });
    }
  }
  const id = meta.id || path.basename(fullPath).replace(/^rollout-/, "").replace(/\.jsonl$/, "");
  return {
    id,
    path: fullPath,
    relativePath: path.relative(codexHome, fullPath),
    archived,
    title: redactText(meta.title || firstUser || path.basename(fullPath), 180),
    cwd: redactText(meta.cwd || "", 300),
    model: meta.model || null,
    branch: meta.git_branch || null,
    source: meta.source || null,
    createdAt: meta.created_at_ms ? new Date(meta.created_at_ms).toISOString() : null,
    updatedAt: stat ? stat.mtime.toISOString() : null,
    size: stat?.size || 0,
    preview: redactText(firstUser, 300),
    toolCalls,
    errors,
    tokens,
    events: includeEvents ? events : undefined
  };
}

function extractReadableText(row) {
  const candidates = [];
  function collect(value) {
    if (!value) return;
    if (typeof value === "string") {
      if (value.length > 3) candidates.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === "object") {
      for (const key of ["text", "content", "message", "preview", "title", "command"]) {
        if (typeof value[key] === "string") candidates.push(value[key]);
      }
      for (const child of Object.values(value)) collect(child);
    }
  }
  collect(row);
  return redactText(candidates.find((item) => item.length > 12) || JSON.stringify(row), 900);
}

function getMemories(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const memoryRoot = path.join(codexHome, "memories");
  const markdownFiles = ["memory_summary.md", "MEMORY.md", "raw_memories.md"].map((name) => {
    const fullPath = path.join(memoryRoot, name);
    const stat = statSafe(fullPath);
    return {
      name,
      exists: Boolean(stat),
      size: stat?.size || 0,
      lastWrite: stat ? stat.mtime.toISOString() : null,
      preview: redactText(readTextSafe(fullPath, 16000), 4000)
    };
  });
  const rollouts = walkFiles(path.join(memoryRoot, "rollout_summaries"), {
    include: (file) => file.endsWith(".md"),
    limit: 250,
    maxDepth: 2
  })
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .map((file) => ({
      name: path.basename(file.fullPath),
      path: file.fullPath,
      size: file.stat.size,
      lastWrite: file.stat.mtime.toISOString(),
      preview: redactText(readTextSafe(file.fullPath, 6000), 1000)
    }));
  const stage = querySqlite(
    path.join(codexHome, "memories_1.sqlite"),
    "select thread_id, source_updated_at, rollout_slug, generated_at, usage_count, last_usage, substr(rollout_summary, 1, 800) as rollout_summary from stage1_outputs order by generated_at desc limit 100;"
  );
  return {
    markdownFiles,
    rollouts,
    stage1: {
      ok: stage.ok,
      adapter: stage.adapter,
      reason: stage.reason || null,
      rows: redactValue(stage.rows || [])
    }
  };
}

function getPromptLikeItems(userDataPath, relativeDir, extension = ".md") {
  const codexHome = getCodexHome(userDataPath);
  return walkFiles(path.join(codexHome, relativeDir), {
    include: (file) => file.endsWith(extension),
    limit: 1000,
    maxDepth: 4
  })
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath))
    .map((file) => {
      const text = readTextSafe(file.fullPath, 12000);
      const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
      const baseName = path.basename(file.fullPath, extension) || path.basename(path.dirname(file.fullPath));
      return {
        name: baseName,
        path: file.fullPath,
        relativePath: path.relative(codexHome, file.fullPath),
        size: file.stat.size,
        lastWrite: file.stat.mtime.toISOString(),
        description: extractFrontmatterValue(frontmatter?.[1] || "", "description"),
        preview: redactText(text, 1600)
      };
    });
}

function getSkills(userDataPath) {
  return getPromptLikeItems(userDataPath, "skills", "SKILL.md");
}

function getAgents(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const tomlAgents = getPromptLikeItems(userDataPath, "agents", ".toml");
  const promptAgents = getPromptLikeItems(userDataPath, "prompts", ".md");
  const rules = getPromptLikeItems(userDataPath, "rules", ".rules");
  return {
    agents: tomlAgents,
    prompts: promptAgents,
    rules,
    hooks: redactText(readTextSafe(path.join(codexHome, "hooks.json"), 24000), 6000)
  };
}

function extractFrontmatterValue(frontmatter, key) {
  const match = String(frontmatter).match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, "m"));
  return match ? match[1] : "";
}

function getPlugins(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const roots = [
    path.join(codexHome, "plugins", "cache"),
    path.join(codexHome, "cache", "codex_app_directory"),
    path.join(codexHome, "cache", "codex_apps_tools")
  ];
  const groups = roots.map((root) => {
    const stat = statSafe(root);
    const children = stat?.isDirectory()
      ? fs.readdirSync(root, { withFileTypes: true }).map((entry) => {
          const fullPath = path.join(root, entry.name);
          const childStat = statSafe(fullPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: childStat?.size || 0,
            lastWrite: childStat ? childStat.mtime.toISOString() : null
          };
        })
      : [];
    return {
      root,
      exists: Boolean(stat),
      children
    };
  });
  return { groups };
}

function getState(userDataPath) {
  const codexHome = getCodexHome(userDataPath);
  const dbPath = path.join(codexHome, "state_5.sqlite");
  const threads = querySqlite(
    dbPath,
    "select id, rollout_path, created_at, updated_at, source, cwd, title, sandbox_policy, approval_mode, tokens_used, archived, git_branch, model, reasoning_effort, preview from threads order by updated_at desc limit 100;"
  );
  const tools = querySqlite(
    dbPath,
    "select thread_id, position, name, namespace, defer_loading, substr(description, 1, 220) as description from thread_dynamic_tools order by thread_id, position limit 250;"
  );
  return {
    counts: {
      threads: tableCount(dbPath, "threads"),
      dynamicTools: tableCount(dbPath, "thread_dynamic_tools"),
      agentJobs: tableCount(dbPath, "agent_jobs"),
      agentJobItems: tableCount(dbPath, "agent_job_items")
    },
    threads: { ok: threads.ok, adapter: threads.adapter, reason: threads.reason || null, rows: redactValue(threads.rows || []) },
    dynamicTools: { ok: tools.ok, adapter: tools.adapter, reason: tools.reason || null, rows: redactValue(tools.rows || []) }
  };
}

function getLogs(userDataPath, level = "", limit = 200) {
  const codexHome = getCodexHome(userDataPath);
  const dbPath = path.join(codexHome, "logs_2.sqlite");
  const where = level ? `where level = '${String(level).replace(/'/g, "''")}'` : "";
  const result = querySqlite(
    dbPath,
    `select id, ts, level, target, thread_id, process_uuid, substr(feedback_log_body, 1, 1200) as body, module_path, file, line, estimated_bytes from logs ${where} order by ts desc limit ${Number(limit) || 200};`
  );
  return {
    ok: result.ok,
    adapter: result.adapter,
    reason: result.reason || null,
    rows: redactValue(result.rows || [])
  };
}

function previewFile(userDataPath, relativePath) {
  const codexHome = getCodexHome(userDataPath);
  const fullPath = path.resolve(codexHome, relativePath);
  if (!isWithin(codexHome, fullPath)) throw new Error("Path is outside Codex home.");
  const stat = statSafe(fullPath);
  if (!stat?.isFile()) throw new Error("File is missing or not a file.");
  const base = path.basename(fullPath).toLowerCase();
  if (base === "auth.json" || base.includes("sid")) {
    return {
      relativePath,
      size: stat.size,
      lastWrite: stat.mtime.toISOString(),
      preview: "[sensitive file: content hidden]"
    };
  }
  return {
    relativePath,
    size: stat.size,
    lastWrite: stat.mtime.toISOString(),
    preview: redactText(readTextSafe(fullPath, 64000), 10000)
  };
}

function exportReport(userDataPath) {
  const report = {
    generatedAt: new Date().toISOString(),
    overview: getOverview(userDataPath),
    settings: getSettings(userDataPath),
    sessions: getSessions(userDataPath, "", 50),
    memories: getMemories(userDataPath),
    skills: getSkills(userDataPath).slice(0, 100),
    plugins: getPlugins(userDataPath),
    state: getState(userDataPath)
  };
  return JSON.stringify(redactValue(report), null, 2);
}

module.exports = {
  getAgents,
  getCodexHome,
  getHealth,
  getLogs,
  getMemories,
  getOverview,
  getPlugins,
  getSessionDetail,
  getSessions,
  getSettings,
  getSkills,
  getState,
  previewFile,
  saveCodexHome,
  exportReport
};
