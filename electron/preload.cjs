const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexObserver", {
  health: () => ipcRenderer.invoke("codex:health"),
  overview: () => ipcRenderer.invoke("codex:overview"),
  settings: () => ipcRenderer.invoke("codex:settings"),
  sessions: (options) => ipcRenderer.invoke("codex:sessions", options),
  sessionDetail: (sessionPath) => ipcRenderer.invoke("codex:session-detail", sessionPath),
  memories: () => ipcRenderer.invoke("codex:memories"),
  skills: () => ipcRenderer.invoke("codex:skills"),
  agents: () => ipcRenderer.invoke("codex:agents"),
  plugins: () => ipcRenderer.invoke("codex:plugins"),
  state: () => ipcRenderer.invoke("codex:state"),
  logs: (options) => ipcRenderer.invoke("codex:logs", options),
  filePreview: (relativePath) => ipcRenderer.invoke("codex:file-preview", relativePath),
  exportReport: () => ipcRenderer.invoke("codex:export-report"),
  chooseHome: () => ipcRenderer.invoke("codex:choose-home"),
  onChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("codex:changed", listener);
    return () => ipcRenderer.removeListener("codex:changed", listener);
  },
  onWatchError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("codex:watch-error", listener);
    return () => ipcRenderer.removeListener("codex:watch-error", listener);
  }
});
