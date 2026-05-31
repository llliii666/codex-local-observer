export type JsonRecord = Record<string, unknown>;

export interface Health {
  codexHome: string;
  exists: boolean;
  readonly: boolean;
  redaction: string;
  sqlite: JsonRecord;
  files: JsonRecord;
  timestamp: string;
}

export interface Overview {
  health: Health;
  directories: Array<JsonRecord & { name: string; exists: boolean; files: number; size: number; lastWrite: string | null }>;
  files: Array<JsonRecord & { name: string; exists: boolean; size: number; lastWrite: string | null }>;
  model: JsonRecord;
  mcpCount: number;
  pluginCount: number;
  projectCount: number;
}

export interface SessionSummary {
  id: string;
  path: string;
  relativePath: string;
  archived: boolean;
  title: string;
  cwd: string;
  model: string | null;
  branch: string | null;
  updatedAt: string | null;
  size: number;
  preview: string;
  toolCalls: number;
  errors: number;
  tokens: number;
  events?: Array<JsonRecord>;
}

export interface CodexObserverApi {
  health(): Promise<Health>;
  overview(): Promise<Overview>;
  settings(): Promise<JsonRecord>;
  sessions(options?: { query?: string; limit?: number }): Promise<SessionSummary[]>;
  sessionDetail(sessionPath: string): Promise<SessionSummary>;
  memories(): Promise<JsonRecord>;
  skills(): Promise<JsonRecord[]>;
  agents(): Promise<JsonRecord>;
  plugins(): Promise<JsonRecord>;
  state(): Promise<JsonRecord>;
  logs(options?: { level?: string; limit?: number }): Promise<JsonRecord>;
  filePreview(relativePath: string): Promise<JsonRecord>;
  exportReport(): Promise<string>;
  chooseHome(): Promise<string | null>;
  onChanged(callback: (payload: JsonRecord) => void): () => void;
  onWatchError(callback: (payload: string) => void): () => void;
}

declare global {
  interface Window {
    codexObserver?: CodexObserverApi;
  }
}

const fallbackMessage =
  "Codex Local Observer must run inside Electron. Use npm run dev:electron or install the Windows app.";

export function api(): CodexObserverApi {
  if (!window.codexObserver) throw new Error(fallbackMessage);
  return window.codexObserver;
}

export function formatBytes(value: unknown): string {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatTime(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function asRows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}
