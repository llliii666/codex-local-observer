# Codex Local Observer

Codex Local Observer 是一个本机优先的 Windows 桌面应用，用于只读查看本机 Codex 的配置、记忆、会话、skills、MCP、插件缓存、agents、prompts、threads/state 和 logs。应用默认脱敏敏感内容，公开仓库只包含源码与脱敏 fixtures，不包含任何真实本机 Codex 数据。

## 核心特性

- 双击桌面图标运行：推荐通过 Windows NSIS 安装包安装，安装后生成 `Codex Local Observer` 桌面和开始菜单快捷方式。
- 本机只读：默认读取 `CODEX_HOME`，未设置时读取 `%USERPROFILE%\.codex`。
- 默认脱敏：`auth.json`、token、bearer、API key、cookie、proxy 凭据只显示元数据或占位符。
- 实时追踪：监听 Codex home 文件变化，页面自动提示最近更新。
- 覆盖范围：`config.toml`、`AGENTS.md`、`hooks.json`、`sessions/`、`archived_sessions/`、`memories/`、`skills/`、`plugins/cache/`、`cache/`、`agents/`、`prompts/`、`rules/`、`automations/`、`state_5.sqlite`、`logs_2.sqlite`、`memories_1.sqlite`、`goals_1.sqlite`。
- 离线使用：数据不上传，搜索和索引都在本机完成。

## 快速启动

开发运行：

```powershell
npm install
npm run dev:electron
```

健康检查：

```powershell
npm run doctor
```

构建渲染端：

```powershell
npm run build
```

生成 Windows 安装包：

```powershell
npm run dist:win
```

生成免安装便携版：

```powershell
npm run package:portable
```

生成产物位于 `release/`。安装 NSIS 安装包后，桌面会出现 `Codex Local Observer` 图标，双击即可运行；打包后的应用不会暴露浏览器端口。

## 配置 Codex Home

默认探测顺序：

1. `CODEX_HOME`
2. `%USERPROFILE%\.codex`
3. 应用内“选择路径”保存的本机目录

开发时也可以复制示例配置：

```powershell
Copy-Item config/local.paths.example.json config/local.paths.json
```

然后把 `codexHome` 改为你的本机 Codex 目录。`config/local.paths.json` 已加入 `.gitignore`，不要提交。

## 验证命令

```powershell
npm run doctor
npm run test
npm run build
npm run secret:scan
```

完整本地验证：

```powershell
npm run verify
```

## 数据安全边界

- 这个项目不包含任何云同步或远程读取能力。
- UI 展示的是脱敏正文、结构化元数据、摘要、索引和本机只读预览。
- `auth.json`、真实会话、真实记忆、SQLite 数据库、`.env`、本机路径配置都不应进入 git。
- `npm run secret:scan` 会扫描源码和 fixtures，发现常见 token 或真实私密路径时失败。

## 给 AI 的自动化提示词

把下面提示词交给本机 AI 工程代理，可完成从 clone 到安装验证的全流程：

```text
你是本机自动化工程代理。请把公开项目 codex-local-observer clone 到本机，安装并连接我的本机 Codex 数据。

目标：
- 安装后生成桌面图标，双击即可打开 Codex Local Observer。
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
7. 运行 npm run test 和 npm run build。
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
  generate-icon.cjs        本地图标生成
fixtures/
  redacted-codex-home/     可公开测试夹具
```

## 上游参考

- `tobitege/codlogs`：会话搜索、导出和脱敏工具思路。
- `Cocoanetics/CodexMonitor`：Codex session 监听思路。

本项目没有直接复制上游实现；核心目标是本机 Codex 桌面控制台和 Windows 一键启动体验。
