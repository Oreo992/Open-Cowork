# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Cowork（Claude Cowork）是一个基于 Electron 的桌面 AI 助手应用，为 Claude Agent SDK 提供 GUI 界面。它与 Claude Code 共享 `~/.claude/settings.json` 配置。

## Build Commands

```bash
# 安装依赖
bun install

# 开发模式（同时启动 React 和 Electron）
bun run dev

# 仅启动 React 开发服务器（端口 5173）
bun run dev:react

# 仅启动 Electron
bun run dev:electron

# 类型检查并构建
bun run build

# ESLint 检查
bun run lint

# 打包发布
bun run dist:mac    # macOS (arm64)
bun run dist:win    # Windows (x64)
bun run dist:linux  # Linux (x64)
```

## Architecture

### Two-Process Model

- **Main Process** (`src/electron/`): Electron 主进程，负责会话管理、SQLite 持久化、IPC 处理、Claude Agent SDK 调用
- **Renderer Process** (`src/ui/`): React 19 + Tailwind CSS 4 界面，通过 IPC 与主进程通信

### Key Files

| 文件 | 职责 |
|------|------|
| `src/electron/main.ts` | Electron 入口点 |
| `src/electron/ipc-handlers.ts` | IPC 事件处理和会话管理 |
| `src/electron/preload.cts` | 安全桥接（上下文隔离） |
| `src/electron/libs/runner.ts` | Claude Agent SDK 查询执行器 |
| `src/electron/libs/session-store.ts` | SQLite 会话持久化（WAL 模式） |
| `src/electron/libs/claude-settings.ts` | 加载 `~/.claude/settings.json` |
| `src/ui/store/useAppStore.ts` | Zustand 状态管理 |
| `src/ui/hooks/useIPC.ts` | IPC 通信 hook |

### IPC Communication

**Client → Main**: `session.start`, `session.continue`, `session.stop`, `session.delete`, `session.list`, `session.history`, `permission.response`

**Main → Renderer**: `session.list`, `session.history`, `session.status`, `session.deleted`, `stream.message`, `stream.user_prompt`, `permission.request`, `runner.error`

### Database Schema

SQLite 数据库包含两张表：
- `sessions`: 会话元数据（id, title, claude_session_id, status, cwd, allowed_tools 等）
- `messages`: 流式消息记录（JSON 序列化的 StreamMessage）

## Build Output Directories

- `dist-electron/`: Electron 编译输出
- `dist-react/`: React 编译输出
- `dist/`: electron-builder 打包输出

## Tech Stack

- Electron 39, React 19, TypeScript 5.9
- Zustand（状态管理）, better-sqlite3（数据库）, Tailwind CSS 4
- @anthropic-ai/claude-agent-sdk 0.2.6
