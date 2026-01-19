import { create } from 'zustand';
import type { ServerEvent, SessionStatus, StreamMessage } from "../types";

export type ModelType = "sonnet" | "opus" | "haiku";

export type PermissionRequest = {
  toolUseId: string;
  toolName: string;
  input: unknown;
};

export type SessionView = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  additionalDirectories?: string[];
  messages: StreamMessage[];
  permissionRequests: PermissionRequest[];
  workspaceFiles: string[];
  lastPrompt?: string;
  createdAt?: number;
  updatedAt?: number;
  hydrated: boolean;
};

interface AppState {
  sessions: Record<string, SessionView>;
  activeSessionId: string | null;
  prompt: string;
  cwd: string;
  additionalDirectories: string[];
  pendingStart: boolean;
  globalError: string | null;
  sessionsLoaded: boolean;
  showDirectorySelector: boolean;
  historyRequested: Set<string>;
  selectedModel: ModelType;

  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setAdditionalDirectories: (dirs: string[]) => void;
  addAdditionalDirectory: (dir: string) => void;
  removeAdditionalDirectory: (dir: string) => void;
  clearAdditionalDirectories: () => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setShowDirectorySelector: (show: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  setSelectedModel: (model: ModelType) => void;
  markHistoryRequested: (sessionId: string) => void;
  resolvePermissionRequest: (sessionId: string, toolUseId: string) => void;
  handleServerEvent: (event: ServerEvent) => void;
}

function createSession(id: string): SessionView {
  return { id, title: "", status: "idle", messages: [], permissionRequests: [], workspaceFiles: [], hydrated: false };
}

// 从消息中提取文件路径
function extractFilePaths(message: StreamMessage): string[] {
  if (!message || typeof message !== "object") return [];
  if (!("type" in message) || message.type !== "assistant") return [];

  const assistantMsg = message as { type: "assistant"; message: { content: Array<{ type: string; name?: string; input?: { file_path?: string } }> } };
  const paths: string[] = [];

  for (const content of assistantMsg.message.content) {
    if (content.type === "tool_use" && (content.name === "Write" || content.name === "Edit")) {
      const filePath = content.input?.file_path;
      if (filePath) paths.push(filePath);
    }
  }

  return paths;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: {},
  activeSessionId: null,
  prompt: "",
  cwd: "",
  additionalDirectories: [],
  pendingStart: false,
  globalError: null,
  sessionsLoaded: false,
  showDirectorySelector: false,
  historyRequested: new Set(),
  selectedModel: "sonnet",

  setPrompt: (prompt) => set({ prompt }),
  setCwd: (cwd) => set({ cwd }),
  setAdditionalDirectories: (additionalDirectories) => set({ additionalDirectories }),
  addAdditionalDirectory: (dir) => set((state) => ({
    additionalDirectories: state.additionalDirectories.includes(dir)
      ? state.additionalDirectories
      : [...state.additionalDirectories, dir]
  })),
  removeAdditionalDirectory: (dir) => set((state) => ({
    additionalDirectories: state.additionalDirectories.filter((d) => d !== dir)
  })),
  clearAdditionalDirectories: () => set({ additionalDirectories: [] }),
  setPendingStart: (pendingStart) => set({ pendingStart }),
  setGlobalError: (globalError) => set({ globalError }),
  setShowDirectorySelector: (showDirectorySelector) => set({ showDirectorySelector }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),

  markHistoryRequested: (sessionId) => {
    set((state) => {
      const next = new Set(state.historyRequested);
      next.add(sessionId);
      return { historyRequested: next };
    });
  },

  resolvePermissionRequest: (sessionId, toolUseId) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return {};
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            permissionRequests: existing.permissionRequests.filter(req => req.toolUseId !== toolUseId)
          }
        }
      };
    });
  },

  handleServerEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "session.list": {
        const nextSessions: Record<string, SessionView> = {};
        for (const session of event.payload.sessions) {
          const existing = state.sessions[session.id] ?? createSession(session.id);
          nextSessions[session.id] = {
            ...existing,
            status: session.status,
            title: session.title,
            cwd: session.cwd,
            additionalDirectories: session.additionalDirectories,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          };
        }

        set({ sessions: nextSessions, sessionsLoaded: true });

        // 不再自动弹出模态框，用户可以直接在输入框输入
        // const hasSessions = event.payload.sessions.length > 0;

        if (event.payload.sessions.length === 0) {
          get().setActiveSessionId(null);
        }

        if (!state.activeSessionId && event.payload.sessions.length > 0) {
          const sorted = [...event.payload.sessions].sort((a, b) => {
            const aTime = a.updatedAt ?? a.createdAt ?? 0;
            const bTime = b.updatedAt ?? b.createdAt ?? 0;
            return aTime - bTime;
          });
          const latestSession = sorted[sorted.length - 1];
          if (latestSession) {
            get().setActiveSessionId(latestSession.id);
          }
        } else if (state.activeSessionId) {
          const stillExists = event.payload.sessions.some(
            (session) => session.id === state.activeSessionId
          );
          if (!stillExists) {
            get().setActiveSessionId(null);
          }
        }
        break;
      }

      case "session.history": {
        const { sessionId, messages, status } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, status, messages, hydrated: true }
            }
          };
        });
        break;
      }

      case "session.status": {
        const { sessionId, status, title, cwd } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
                title: title ?? existing.title,
                cwd: cwd ?? existing.cwd,
                updatedAt: Date.now()
              }
            }
          };
        });

        if (state.pendingStart) {
          get().setActiveSessionId(sessionId);
          set({ pendingStart: false, showDirectorySelector: false });
        }
        break;
      }

      case "session.deleted": {
        const { sessionId } = event.payload;
        const state = get();
        if (!state.sessions[sessionId]) break;
        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];
        set({
          sessions: nextSessions
        });
        if (state.activeSessionId === sessionId) {
          const remaining = Object.values(nextSessions).sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          get().setActiveSessionId(remaining[0]?.id ?? null);
        }
        break;
      }

      case "stream.message": {
        const { sessionId, message } = event.payload;
        const newFiles = extractFilePaths(message);
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          const updatedFiles = newFiles.length > 0
            ? [...new Set([...existing.workspaceFiles, ...newFiles])]
            : existing.workspaceFiles;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, messages: [...existing.messages, message], workspaceFiles: updatedFiles }
            }
          };
        });
        break;
      }

      case "stream.user_prompt": {
        const { sessionId, prompt } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                messages: [...existing.messages, { type: "user_prompt", prompt }]
              }
            }
          };
        });
        break;
      }

      case "permission.request": {
        const { sessionId, toolUseId, toolName, input } = event.payload;
        console.log(`[permission.request] Received: tool=${toolName}, toolUseId=${toolUseId}`);
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          console.log(`[permission.request] Adding to session ${sessionId}, current requests: ${existing.permissionRequests.length}`);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                permissionRequests: [...existing.permissionRequests, { toolUseId, toolName, input }]
              }
            }
          };
        });
        break;
      }

      case "runner.error": {
        set({ globalError: event.payload.message });
        break;
      }
    }
  }
}));
