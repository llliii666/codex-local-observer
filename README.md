# Codex Local Observer

Codex Local Observer 是一个只面向 **Codex 单独软件** 的 Windows 桌面应用，用来本机只读查看 Codex 的配置、记忆、会话、skills、MCP、插件缓存、agents、prompts、threads/state 和 logs。项目不读取、不展示、不集成其他代理软件内容。

## 推荐下载

公开仓库：[github.com/llliii666/codex-local-observer](https://github.com/llliii666/codex-local-observer)

推荐普通用户直接安装：

- [下载安装包 `Codex Local Observer Setup 0.1.3.exe`](https://github.com/llliii666/codex-local-observer/releases/download/v0.1.3/Codex.Local.Observer.Setup.0.1.3.exe)
- [下载免安装版 `Codex Local Observer 0.1.3.exe`](https://github.com/llliii666/codex-local-observer/releases/download/v0.1.3/Codex.Local.Observer.0.1.3.exe)
- [查看 v0.1.3 Release](https://github.com/llliii666/codex-local-observer/releases/tag/v0.1.3)

安装包是推荐交付方式：安装后会创建 `Codex Local Observer` 桌面图标和开始菜单项，双击即可打开，不需要每次手动运行命令或打开浏览器端口。

## 核心特性

- **双击运行**：Electron + NSIS 安装包，安装后从桌面图标启动。
- **本机只读**：优先读取 `CODEX_HOME`，否则读取 `%USERPROFILE%\.codex`，也可以在应用内手动选择 Codex home。
- **默认脱敏**：`auth.json`、token、bearer、API key、cookie、proxy 凭据默认只显示存在状态、大小和更新时间。
- **实时追踪**：监听 Codex home 文件变化，在顶部状态栏显示最近变更。
- **覆盖范围**：`config.toml`、`AGENTS.md`、`hooks.json`、`sessions/`、`archived_sessions/`、`memories/`、`skills/`、`plugins/cache/`、`agents/`、`prompts/`、`rules/`、`automations/`、`state_5.sqlite`、`logs_2.sqlite`、`memories_1.sqlite`、`goals_1.sqlite`。
- **离线使用**：搜索、索引、脱敏和 SQLite 读取都在本机完成。
- **产品内安装页**：应用内提供安装包、portable、源码模式和 AI 自动化提示词入口。

## 本地运行

开发运行：

```powershell
npm install
npm run dev:electron
```

健康检查：

```powershell
npm run doctor
```

完整验证：

```powershell
npm run verify
```

生成 Windows 安装包：

```powershell
npm run dist:win
```

生成免安装版：

```powershell
npm run package:portable
```

生成产物位于 `release/`。打包后的应用直接加载本地渲染文件，不暴露浏览器端口。

## Codex Home 探测

探测顺序：

1. `CODEX_HOME`
2. `%USERPROFILE%\.codex`
3. 应用内“选择路径”保存的本机目录

开发时可以复制示例配置：

```powershell
Copy-Item config/local.paths.example.json config/local.paths.json
```

然后把 `codexHome` 改为你的本机 Codex 目录。`config/local.paths.json` 已加入 `.gitignore`，不要提交。

## 数据安全边界

- 不提供云同步或远程访问能力。
- 公开仓库只提交源码、脱敏 fixtures、示例配置和文档。
- 不提交真实 `auth.json`、真实 session、真实 memory、真实 SQLite、`.env`、本机路径配置或 token。
- 发布前运行 `npm run secret:scan`。

## 给 AI 的自动化提示词

把下面提示词交给本机 AI 工程代理，可以完成从 clone 到验证安装的流程：

```text
你是本机自动化工程代理。请把公开项目 codex-local-observer clone 到本机，安装并连接我的本机 Codex 数据。
注意：这是只针对 Codex 的项目，与其他代理软件无关，不要读取或展示非 Codex 内容。

目标：
- 优先安装 Windows NSIS 安装包，安装后生成桌面图标，双击即可打开 Codex Local Observer。
- 页面能查看本机 Codex 的设置、记忆、会话、skills、MCP、插件、agents、prompts、threads、logs 等内容。
- 所有敏感数据默认脱敏，不允许提交真实 Codex 数据到 GitHub。

步骤：
1. git clone https://github.com/llliii666/codex-local-observer.git
2. cd codex-local-observer
3. npm install
4. 探测 Codex home：
   - 优先读取 CODEX_HOME
   - 如果没有，使用 %USERPROFILE%\.codex
5. 运行 npm run doctor，确认 Codex home、sessions、memories、skills、plugins、config.toml、state_5.sqlite、logs_2.sqlite、memories_1.sqlite 可读。
6. 运行 npm run dev:electron 做开发验证。
7. 运行 npm run verify。
8. 运行 npm run dist:win 生成 Windows 安装包。
9. 安装生成的 NSIS 安装包，确认桌面出现 Codex Local Observer 图标。
10. 双击桌面图标，确认无需手动运行命令行、无需手动打开端口即可查看页面。
11. 检查 git status，确保未提交任何真实 Codex 数据，包括 auth.json、真实 session、真实 memory、真实 SQLite、.env、local path 配置和 token。
12. 如果需要提交修改，只提交源码、README、脱敏 fixtures 和示例配置。
```

## 开发结构

```text
electron/
  main.cjs                 Electron 主进程
  preload.cjs              IPC 安全桥
  services/                Codex 只读采集、脱敏、SQLite fallback
src/renderer/
  App.tsx                  React 工作台
  styles.css               桌面控制台视觉系统
scripts/
  doctor.cjs               本机健康检查
  secret-scan.cjs          发布前敏感数据扫描
  check-electron-dist.cjs  Electron file:// 打包路径检查
  generate-icon.cjs        本地图标生成
fixtures/
  redacted-codex-home/     可公开测试夹具
```

## 参考来源

- 本地 `creative-reference-vault/showcases/local-builds/bento-ai-command-center/`：用于信息层级、bento 操作台和安装页布局参考。
- 本地 `creative-reference-vault/showcases/local-builds/react-bits-interaction-lab/`：用于克制动效、hover 反馈和 reduced-motion 参考。
- `tobitege/codlogs`：Codex session 搜索、导出和脱敏思路参考。
- `Cocoanetics/CodexMonitor`：Codex session 监听思路参考。

本项目没有复制上游实现，目标是 Codex-only 的本机桌面控制台和 Windows 一键启动体验。
