const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const collector = require("./services/codex-collector.cjs");

let mainWindow = null;
let codexWatcher = null;
let watcherTimer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    title: "Codex Local Observer",
    backgroundColor: "#f7f8fb",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";
  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function userDataPath() {
  return app.getPath("userData");
}

function startWatcher() {
  stopWatcher();
  const codexHome = collector.getCodexHome(userDataPath());
  if (!fs.existsSync(codexHome)) return;
  try {
    codexWatcher = fs.watch(codexHome, { recursive: true }, (_event, filename) => {
      clearTimeout(watcherTimer);
      watcherTimer = setTimeout(() => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send("codex:changed", {
            filename: filename ? String(filename) : null,
            timestamp: new Date().toISOString()
          });
        });
      }, 450);
    });
  } catch (error) {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("codex:watch-error", error.message);
    });
  }
}

function stopWatcher() {
  if (codexWatcher) {
    codexWatcher.close();
    codexWatcher = null;
  }
}

function registerIpc() {
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (_event, ...args) => fn(userDataPath(), ...args));
  };

  handle("codex:health", collector.getHealth);
  handle("codex:overview", collector.getOverview);
  handle("codex:settings", collector.getSettings);
  handle("codex:sessions", (userData, options = {}) =>
    collector.getSessions(userData, options.query || "", options.limit || 120)
  );
  handle("codex:session-detail", (userData, sessionPath) =>
    collector.getSessionDetail(userData, sessionPath)
  );
  handle("codex:memories", collector.getMemories);
  handle("codex:skills", collector.getSkills);
  handle("codex:agents", collector.getAgents);
  handle("codex:plugins", collector.getPlugins);
  handle("codex:state", collector.getState);
  handle("codex:logs", (userData, options = {}) =>
    collector.getLogs(userData, options.level || "", options.limit || 200)
  );
  handle("codex:file-preview", (userData, relativePath) =>
    collector.previewFile(userData, relativePath)
  );
  handle("codex:export-report", collector.exportReport);

  ipcMain.handle("codex:choose-home", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Codex home",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const saved = collector.saveCodexHome(userDataPath(), result.filePaths[0]);
    startWatcher();
    return saved;
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("dev.codex.localobserver");
  if (process.argv.includes("--smoke")) {
    const health = collector.getHealth(userDataPath());
    console.log(
      JSON.stringify(
        {
          ok: health.exists,
          codexHome: health.codexHome,
          config: health.files["config.toml"]?.exists,
          sessions: health.files["session_index.jsonl"]?.exists
        },
        null,
        2
      )
    );
    app.quit();
    return;
  }
  registerIpc();
  createWindow();
  startWatcher();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  stopWatcher();
  if (process.platform !== "darwin") app.quit();
});
