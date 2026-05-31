import {
  Activity,
  Archive,
  BookOpen,
  Boxes,
  Brain,
  FileCog,
  FileJson,
  FolderOpen,
  History,
  KeyRound,
  ListTree,
  Plug,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  TerminalSquare
} from "lucide-react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, asRows, formatBytes, formatTime, Health, JsonRecord, Overview, SessionSummary } from "./api";

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useLoader<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ data: null, loading: true, error: null });
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    loader()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) =>
        setState({ data: null, loading: false, error: error instanceof Error ? error.message : String(error) })
      );
  }, deps);
  useEffect(refresh, [refresh]);
  return { ...state, refresh };
}

const navigation = [
  { to: "/", label: "总览", icon: Activity },
  { to: "/sessions", label: "会话", icon: History },
  { to: "/memories", label: "记忆", icon: Brain },
  { to: "/settings", label: "设置/MCP", icon: FileCog },
  { to: "/skills", label: "Skills/Agents", icon: BookOpen },
  { to: "/plugins", label: "插件缓存", icon: Plug },
  { to: "/state", label: "Threads/State", icon: ServerCog },
  { to: "/logs", label: "Logs", icon: TerminalSquare }
];

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [lastChange, setLastChange] = useState<string>("");
  const [watchError, setWatchError] = useState<string>("");

  const reloadHealth = useCallback(() => {
    api()
      .health()
      .then(setHealth)
      .catch((error: unknown) => setWatchError(error instanceof Error ? error.message : String(error)));
  }, []);

  useEffect(() => {
    reloadHealth();
    const disposeChanged = api().onChanged((payload) => {
      setLastChange(`${payload.filename || "Codex home"} · ${formatTime(payload.timestamp)}`);
      reloadHealth();
    });
    const disposeError = api().onWatchError(setWatchError);
    return () => {
      disposeChanged();
      disposeError();
    };
  }, [reloadHealth]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">CL</div>
          <div>
            <strong>Codex Local Observer</strong>
            <span>本机只读 · 默认脱敏</span>
          </div>
        </div>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={18} />
          <span>auth/token/cookie 内容隐藏，导出仅输出脱敏报告。</span>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="path-block">
            <span className={health?.exists ? "status-dot ok" : "status-dot bad"} />
            <div>
              <strong>{health?.codexHome || "Detecting Codex home"}</strong>
              <span>{lastChange || watchError || "实时监听已启动"}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={reloadHealth} title="刷新状态">
              <RefreshCw size={16} />
              刷新
            </button>
            <button
              type="button"
              onClick={async () => {
                await api().chooseHome();
                reloadHealth();
              }}
              title="选择 Codex home"
            >
              <FolderOpen size={16} />
              选择路径
            </button>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/state" element={<StatePage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function PageFrame({
  title,
  icon,
  children,
  aside
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="page-grid">
      <div className="content-flow">
        <div className="page-title">
          {icon}
          <h1>{title}</h1>
        </div>
        {children}
      </div>
      <aside className="inspector">{aside || <RedactionNote />}</aside>
    </section>
  );
}

function LoadBlock<T>({
  state,
  children
}: {
  state: LoadState<T>;
  children: (data: T) => React.ReactNode;
}) {
  if (state.loading) return <div className="empty-state">读取本机 Codex 数据中...</div>;
  if (state.error) return <div className="empty-state error">{state.error}</div>;
  if (!state.data) return <div className="empty-state">没有可显示的数据</div>;
  return <>{children(state.data)}</>;
}

function OverviewPage() {
  const state = useLoader<Overview>(() => api().overview());
  return (
    <PageFrame
      title="Codex 总览"
      icon={<Activity size={24} />}
      aside={<OverviewInspector data={state.data} refresh={state.refresh} />}
    >
      <LoadBlock state={state}>
        {(data) => (
          <>
            <MetricStrip
              items={[
                ["数据源", data.health.exists ? "可读" : "缺失"],
                ["MCP", data.mcpCount],
                ["插件配置", data.pluginCount],
                ["可信项目", data.projectCount],
                ["模型", String(data.model?.name || "-")]
              ]}
            />
            <Section title="目录库存">
              <DataTable
                rows={data.directories}
                columns={[
                  ["name", "目录"],
                  ["files", "文件数"],
                  ["size", "大小", formatBytes],
                  ["lastWrite", "最近更新", formatTime],
                  ["exists", "状态", (value) => (value ? "可读" : "缺失")]
                ]}
              />
            </Section>
            <Section title="关键文件">
              <DataTable
                rows={data.files}
                columns={[
                  ["name", "文件"],
                  ["size", "大小", formatBytes],
                  ["lastWrite", "最近更新", formatTime],
                  ["exists", "状态", (value) => (value ? "可读" : "缺失")]
                ]}
              />
            </Section>
          </>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function OverviewInspector({ data, refresh }: { data: Overview | null; refresh: () => void }) {
  const sqlite = (data?.health.sqlite || {}) as JsonRecord;
  return (
    <>
      <button className="wide-action" type="button" onClick={refresh}>
        <RefreshCw size={16} />
        重新读取
      </button>
      <Section title="SQLite 状态" compact>
        {Object.entries(sqlite).map(([name, value]) => {
          const item = value as JsonRecord;
          return (
            <div className="mini-row" key={name}>
              <span>{name}</span>
              <strong>{item.ok ? `${item.rows ?? 0} rows` : "不可用"}</strong>
            </div>
          );
        })}
      </Section>
      <RedactionNote />
    </>
  );
}

function SessionsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const state = useLoader<SessionSummary[]>(() => api().sessions({ query, limit: 180 }), [query]);
  const detail = useLoader<SessionSummary>(
    () => (selected ? api().sessionDetail(selected.path) : Promise.resolve(selected as unknown as SessionSummary)),
    [selected?.path]
  );

  return (
    <PageFrame
      title="会话"
      icon={<History size={24} />}
      aside={
        selected ? (
          <SessionDetail state={detail} />
        ) : (
          <div className="empty-state">选择一条会话查看工具调用、错误和脱敏事件。</div>
        )
      }
    >
      <div className="toolbar">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、路径、模型、分支" />
      </div>
      <LoadBlock state={state}>
        {(rows) => (
          <div className="list-table">
            {rows.map((row) => (
              <button
                type="button"
                className={selected?.path === row.path ? "session-row selected" : "session-row"}
                key={row.path}
                onClick={() => setSelected(row)}
              >
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.cwd || row.relativePath}</span>
                </div>
                <span>{row.model || "-"}</span>
                <span>{row.archived ? "归档" : "活动"}</span>
                <span>{row.toolCalls}</span>
                <span>{row.errors}</span>
                <span>{formatTime(row.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function SessionDetail({ state }: { state: LoadState<SessionSummary> }) {
  return (
    <LoadBlock state={state}>
      {(detail) => (
        <>
          <Section title="会话摘要" compact>
            <KeyValue label="ID" value={detail.id} />
            <KeyValue label="模型" value={detail.model || "-"} />
            <KeyValue label="工具调用线索" value={detail.toolCalls} />
            <KeyValue label="错误线索" value={detail.errors} />
            <KeyValue label="大小" value={formatBytes(detail.size)} />
          </Section>
          <Section title="脱敏事件" compact>
            <div className="event-list">
              {(detail.events || []).slice(0, 40).map((event, index) => (
                <div className="event" key={`${event.type}-${index}`}>
                  <strong>{String(event.type || "event")}</strong>
                  <span>{String(event.summary || "").slice(0, 900)}</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </LoadBlock>
  );
}

function MemoriesPage() {
  const state = useLoader<JsonRecord>(() => api().memories());
  return (
    <PageFrame title="记忆" icon={<Brain size={24} />}>
      <LoadBlock state={state}>
        {(data) => (
          <>
            <Section title="Markdown 记忆文件">
              <PreviewGrid rows={asRows(data.markdownFiles)} />
            </Section>
            <Section title="Rollout summaries">
              <DataTable
                rows={asRows(data.rollouts)}
                columns={[
                  ["name", "文件"],
                  ["size", "大小", formatBytes],
                  ["lastWrite", "最近更新", formatTime],
                  ["preview", "预览"]
                ]}
              />
            </Section>
            <Section title="SQLite stage1 outputs">
              <DataTable
                rows={asRows((data.stage1 as JsonRecord)?.rows)}
                columns={[
                  ["thread_id", "Thread"],
                  ["rollout_slug", "Slug"],
                  ["usage_count", "Usage"],
                  ["rollout_summary", "摘要"]
                ]}
              />
            </Section>
          </>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function SettingsPage() {
  const state = useLoader<JsonRecord>(() => api().settings());
  return (
    <PageFrame title="设置 / MCP" icon={<FileCog size={24} />}>
      <LoadBlock state={state}>
        {(data) => (
          <>
            <MetricStrip
              items={[
                ["Sections", asRows(data.sections).length || (Array.isArray(data.sections) ? data.sections.length : 0)],
                ["MCP Servers", Array.isArray(data.mcpServers) ? data.mcpServers.length : 0],
                ["Plugins", Array.isArray(data.plugins) ? data.plugins.length : 0],
                ["Projects", Array.isArray(data.projects) ? data.projects.length : 0]
              ]}
            />
            <Section title="配置键">
              <DataTable
                rows={asRows(data.keys)}
                columns={[
                  ["section", "Section"],
                  ["key", "Key"],
                  ["value", "Value"]
                ]}
              />
            </Section>
            <Section title="MCP Servers">
              <PillList values={(data.mcpServers as string[]) || []} />
            </Section>
          </>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function SkillsPage() {
  const skills = useLoader<JsonRecord[]>(() => api().skills());
  const agents = useLoader<JsonRecord>(() => api().agents());
  return (
    <PageFrame title="Skills / Agents / Prompts" icon={<BookOpen size={24} />}>
      <LoadBlock state={skills}>
        {(rows) => (
          <Section title="Skills">
            <DataTable
              rows={rows}
              columns={[
                ["name", "Name"],
                ["description", "Description"],
                ["relativePath", "Path"],
                ["lastWrite", "Updated", formatTime]
              ]}
            />
          </Section>
        )}
      </LoadBlock>
      <LoadBlock state={agents}>
        {(data) => (
          <>
            <Section title="Agents">
              <DataTable
                rows={asRows(data.agents)}
                columns={[
                  ["name", "Name"],
                  ["relativePath", "Path"],
                  ["lastWrite", "Updated", formatTime]
                ]}
              />
            </Section>
            <Section title="Prompts">
              <DataTable
                rows={asRows(data.prompts)}
                columns={[
                  ["name", "Name"],
                  ["relativePath", "Path"],
                  ["lastWrite", "Updated", formatTime]
                ]}
              />
            </Section>
          </>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function PluginsPage() {
  const state = useLoader<JsonRecord>(() => api().plugins());
  return (
    <PageFrame title="插件缓存" icon={<Plug size={24} />}>
      <LoadBlock state={state}>
        {(data) => (
          <div className="stack">
            {asRows(data.groups).map((group) => (
              <Section title={String(group.root || "cache")} key={String(group.root)}>
                <DataTable
                  rows={asRows(group.children)}
                  columns={[
                    ["name", "Name"],
                    ["type", "Type"],
                    ["size", "Size", formatBytes],
                    ["lastWrite", "Updated", formatTime]
                  ]}
                />
              </Section>
            ))}
          </div>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function StatePage() {
  const state = useLoader<JsonRecord>(() => api().state());
  return (
    <PageFrame title="Threads / State" icon={<ListTree size={24} />}>
      <LoadBlock state={state}>
        {(data) => (
          <>
            <MetricStrip
              items={Object.entries((data.counts as JsonRecord) || {}).map(([key, value]) => [key, String(value ?? "-")])}
            />
            <Section title="Threads">
              <DataTable
                rows={asRows((data.threads as JsonRecord)?.rows)}
                columns={[
                  ["title", "Title"],
                  ["cwd", "CWD"],
                  ["model", "Model"],
                  ["tokens_used", "Tokens"],
                  ["archived", "Archived"],
                  ["updated_at", "Updated"]
                ]}
              />
            </Section>
            <Section title="Dynamic tools">
              <DataTable
                rows={asRows((data.dynamicTools as JsonRecord)?.rows)}
                columns={[
                  ["thread_id", "Thread"],
                  ["position", "Position"],
                  ["namespace", "Namespace"],
                  ["name", "Name"],
                  ["description", "Description"]
                ]}
              />
            </Section>
          </>
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function LogsPage() {
  const [level, setLevel] = useState("");
  const state = useLoader<JsonRecord>(() => api().logs({ level, limit: 250 }), [level]);
  return (
    <PageFrame title="Logs" icon={<TerminalSquare size={24} />}>
      <div className="toolbar">
        <FileJson size={16} />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="">全部级别</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
      </div>
      <LoadBlock state={state}>
        {(data) => (
          <DataTable
            rows={asRows(data.rows)}
            columns={[
              ["level", "Level"],
              ["target", "Target"],
              ["thread_id", "Thread"],
              ["body", "Body"],
              ["file", "File"],
              ["line", "Line"]
            ]}
          />
        )}
      </LoadBlock>
    </PageFrame>
  );
}

function Section({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={compact ? "section compact" : "section"}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MetricStrip({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <div className="metric-strip">
      {items.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

type Column = [string, string, ((value: unknown, row: JsonRecord) => React.ReactNode)?];

function DataTable({ rows, columns }: { rows: JsonRecord[]; columns: Column[] }) {
  if (!rows.length) return <div className="empty-state">暂无数据</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column[0]}>{column[1]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id || row.path || row.name || index)}>
              {columns.map(([key, , formatter]) => (
                <td key={key}>{formatter ? formatter(row[key], row) : renderCell(row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return <code>{JSON.stringify(value).slice(0, 400)}</code>;
  return String(value);
}

function PreviewGrid({ rows }: { rows: JsonRecord[] }) {
  return (
    <div className="preview-grid">
      {rows.map((row) => (
        <article className="preview-block" key={String(row.name)}>
          <div>
            <strong>{String(row.name)}</strong>
            <span>{formatBytes(row.size)} · {formatTime(row.lastWrite)}</span>
          </div>
          <pre>{String(row.preview || "")}</pre>
        </article>
      ))}
    </div>
  );
}

function PillList({ values }: { values: string[] }) {
  if (!values.length) return <div className="empty-state">暂无数据</div>;
  return (
    <div className="pill-list">
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mini-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RedactionNote() {
  const navigate = useNavigate();
  return (
    <>
      <Section title="数据边界" compact>
        <div className="note-list">
          <p>只读取 Codex home，不读取其他本机代理工具目录。</p>
          <p>auth、token、cookie、proxy 凭据默认隐藏正文。</p>
          <p>会话和记忆展示脱敏预览，导出也只输出脱敏报告。</p>
        </div>
      </Section>
      <button className="wide-action" type="button" onClick={() => navigate("/settings")}>
        <KeyRound size={16} />
        查看脱敏配置
      </button>
    </>
  );
}
