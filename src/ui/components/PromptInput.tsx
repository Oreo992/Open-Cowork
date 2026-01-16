import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientEvent } from "../types";
import { useAppStore, type ModelType } from "../store/useAppStore";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";
const MAX_ROWS = 12;
const LINE_HEIGHT = 21;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;

const MODEL_OPTIONS: { value: ModelType; label: string }[] = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

interface PromptInputProps {
  sendEvent: (event: ClientEvent) => void;
}

export function usePromptActions(sendEvent: (event: ClientEvent) => void) {
  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const additionalDirectories = useAppStore((state) => state.additionalDirectories);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const pendingStart = useAppStore((state) => state.pendingStart);
  const selectedModel = useAppStore((state) => state.selectedModel);
  const setPrompt = useAppStore((state) => state.setPrompt);
  const setPendingStart = useAppStore((state) => state.setPendingStart);
  const setGlobalError = useAppStore((state) => state.setGlobalError);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const isRunning = activeSession?.status === "running";

  const handleSend = useCallback(async () => {
    if (!prompt.trim() || pendingStart) return;

    if (!activeSessionId) {
      // 新会话：使用 store 中的 cwd 和 additionalDirectories
      let title = "";
      try {
        setPendingStart(true);
        title = await window.electron.generateSessionTitle(prompt);
      } catch (error) {
        console.error(error);
        setPendingStart(false);
        setGlobalError("获取会话标题失败");
        return;
      }
      sendEvent({
        type: "session.start",
        payload: {
          title,
          prompt,
          cwd: cwd.trim() || undefined,
          additionalDirectories: additionalDirectories.length > 0 ? additionalDirectories : undefined,
          allowedTools: DEFAULT_ALLOWED_TOOLS,
          model: selectedModel
        }
      });
    } else {
      if (activeSession?.status === "running") {
        setGlobalError("会话正在运行中，请等待完成");
        return;
      }
      sendEvent({ type: "session.continue", payload: { sessionId: activeSessionId, prompt } });
    }
    setPrompt("");
  }, [activeSession, activeSessionId, additionalDirectories, cwd, pendingStart, prompt, selectedModel, sendEvent, setGlobalError, setPendingStart, setPrompt]);

  const handleStop = useCallback(() => {
    if (!activeSessionId) return;
    sendEvent({ type: "session.stop", payload: { sessionId: activeSessionId } });
  }, [activeSessionId, sendEvent]);

  return { prompt, setPrompt, isRunning, pendingStart, handleSend, handleStop };
}

export function PromptInput({ sendEvent }: PromptInputProps) {
  const { prompt, setPrompt, isRunning, pendingStart, handleSend, handleStop } = usePromptActions(sendEvent);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const cwd = useAppStore((state) => state.cwd);
  const additionalDirectories = useAppStore((state) => state.additionalDirectories);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const setShowDirectorySelector = useAppStore((state) => state.setShowDirectorySelector);
  const selectedModel = useAppStore((state) => state.selectedModel);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);

  // 获取当前会话的目录信息（如果有活动会话）
  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const displayCwd = activeSession?.cwd || cwd;
  const displayAdditionalCount = activeSession?.additionalDirectories?.length || additionalDirectories.length;
  const workspaceFiles = activeSession?.workspaceFiles || [];

  // 判断会话是否已开始（有消息或正在运行）
  const sessionStarted = activeSession && (activeSession.messages.length > 0 || activeSession.status === "running");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || pendingStart) return;
    e.preventDefault();
    if (isRunning) { handleStop(); return; }
    handleSend();
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    const scrollHeight = target.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      target.style.height = `${MAX_HEIGHT}px`;
      target.style.overflowY = "auto";
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = "hidden";
    }
  };

  useEffect(() => {
    if (!promptRef.current) return;
    promptRef.current.style.height = "auto";
    const scrollHeight = promptRef.current.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      promptRef.current.style.height = `${MAX_HEIGHT}px`;
      promptRef.current.style.overflowY = "auto";
    } else {
      promptRef.current.style.height = `${scrollHeight}px`;
      promptRef.current.style.overflowY = "hidden";
    }
  }, [prompt]);

  // 截断显示路径
  const truncatePath = (path: string, maxLen = 30) => {
    if (!path) return "选择目录...";
    if (path.length <= maxLen) return path;
    return "..." + path.slice(-maxLen + 3);
  };

  // 获取文件名
  const getFileName = (path: string) => {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
  };

  return (
    <section className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent pb-6 px-2 lg:pb-8 pt-8 lg:ml-[280px]">
      <div className="mx-auto flex w-full max-w-full flex-col gap-2 lg:max-w-3xl">
        {/* 目录和模型指示器 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !activeSessionId && setShowDirectorySelector(true)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              activeSessionId
                ? "border-ink-900/10 bg-surface-secondary text-muted cursor-default"
                : "border-ink-900/10 bg-surface text-muted hover:border-accent/40 hover:text-ink-700 cursor-pointer"
            }`}
            title={displayCwd || "点击选择目录"}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span className="truncate max-w-[200px]">{truncatePath(displayCwd)}</span>
            {displayAdditionalCount > 0 && (
              <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                +{displayAdditionalCount}
              </span>
            )}
          </button>

          {/* 模型选择器 - 仅在会话未开始时可用 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => !sessionStarted && setShowModelMenu(!showModelMenu)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                sessionStarted
                  ? "border-ink-900/10 bg-surface-secondary text-muted cursor-default"
                  : "border-ink-900/10 bg-surface text-muted hover:border-accent/40 hover:text-ink-700 cursor-pointer"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span>{MODEL_OPTIONS.find(m => m.value === selectedModel)?.label}</span>
              {!sessionStarted && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>
            {showModelMenu && !sessionStarted && (
              <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-ink-900/10 bg-surface py-1 shadow-lg z-10">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setSelectedModel(option.value); setShowModelMenu(false); }}
                    className={`w-full px-4 py-1.5 text-left text-xs hover:bg-surface-secondary transition-colors ${
                      selectedModel === option.value ? "text-accent font-medium" : "text-ink-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 工作区文件 */}
        {workspaceFiles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted">工作区:</span>
            {workspaceFiles.slice(0, 5).map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-ink-900/10 bg-surface px-2 py-0.5 text-xs text-ink-700"
                title={file}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                {getFileName(file)}
              </span>
            ))}
            {workspaceFiles.length > 5 && (
              <span className="text-xs text-muted">+{workspaceFiles.length - 5} 个文件</span>
            )}
          </div>
        )}

        {/* 输入框 */}
        <div className="flex items-end gap-3 rounded-2xl border border-ink-900/10 bg-surface px-4 py-3 shadow-card">
          <textarea
            rows={1}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-800 placeholder:text-muted focus:outline-none"
            placeholder="描述你想让 Agent 处理的任务..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            ref={promptRef}
          />
          <button
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              pendingStart
                ? "bg-accent/50 text-white cursor-not-allowed"
                : isRunning
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-accent text-white hover:bg-accent-hover"
            }`}
            onClick={pendingStart ? undefined : (isRunning ? handleStop : handleSend)}
            disabled={pendingStart}
            aria-label={pendingStart ? "启动中..." : isRunning ? "停止会话" : "发送消息"}
          >
            {pendingStart ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : isRunning ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z" fill="currentColor" /></svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
