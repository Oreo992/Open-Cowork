import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";
import { claudeCodePath, enhancedEnv } from "./util.js";
import { claudeCodeEnv } from "./claude-settings.js";
import { readdirSync, rmSync, statSync } from "fs";
import { join } from "path";

const MODEL_MAP: Record<string, string> = {
  sonnet: claudeCodeEnv.ANTHROPIC_DEFAULT_SONNET_MODEL || "claude-sonnet-4-20250514",
  opus: claudeCodeEnv.ANTHROPIC_DEFAULT_OPUS_MODEL || "claude-opus-4-20250514",
  haiku: claudeCodeEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL || "claude-haiku-3-5-20241022"
};


export type RunnerOptions = {
  prompt: string;
  session: Session;
  resumeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: Partial<Session>) => void;
};

export type RunnerHandle = {
  abort: () => void;
};

const DEFAULT_CWD = process.cwd();

// 临时文件匹配模式：tmpclaude-xxxx-cwd 格式
const TMP_CLAUDE_PATTERN = /^tmpclaude-[a-f0-9]+-cwd$/i;

/**
 * 清理工作目录中的 Claude SDK 临时文件
 */
function cleanupTempFiles(cwd: string): void {
  try {
    const entries = readdirSync(cwd);
    for (const entry of entries) {
      if (TMP_CLAUDE_PATTERN.test(entry)) {
        const fullPath = join(cwd, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            rmSync(fullPath, { recursive: true, force: true });
            console.log(`[Cleanup] Removed temp directory: ${entry}`);
          }
        } catch {
          // 忽略单个文件的删除错误
        }
      }
    }
  } catch {
    // 忽略目录读取错误
  }
}

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const abortController = new AbortController();

  const sendMessage = (message: SDKMessage) => {
    onEvent({
      type: "stream.message",
      payload: { sessionId: session.id, message }
    });
  };

  const sendPermissionRequest = (toolUseId: string, toolName: string, input: unknown) => {
    onEvent({
      type: "permission.request",
      payload: { sessionId: session.id, toolUseId, toolName, input }
    });
  };

  // Start the query in the background
  (async () => {
    try {
      const modelId = session.model ? MODEL_MAP[session.model] : undefined;
      const q = query({
        prompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          additionalDirectories: session.additionalDirectories ?? [],
          resume: resumeSessionId,
          abortController,
          env: enhancedEnv,
          pathToClaudeCodeExecutable: claudeCodePath,
          permissionMode: "default",
          includePartialMessages: true,
          model: modelId,
          // 启用 Skills、Slash Commands 和 CLAUDE.md 支持
          settingSources: ["user", "project"],
          canUseTool: async (toolName, input, { signal }) => {
            // For AskUserQuestion, we need to wait for user response
            if (toolName === "AskUserQuestion") {
              const toolUseId = crypto.randomUUID();

              // Send permission request to frontend
              sendPermissionRequest(toolUseId, toolName, input);

              // Create a promise that will be resolved when user responds
              return new Promise<PermissionResult>((resolve) => {
                session.pendingPermissions.set(toolUseId, {
                  toolUseId,
                  toolName,
                  input,
                  resolve: (result) => {
                    session.pendingPermissions.delete(toolUseId);
                    resolve(result as PermissionResult);
                  }
                });

                // Handle abort
                signal.addEventListener("abort", () => {
                  session.pendingPermissions.delete(toolUseId);
                  resolve({ behavior: "deny", message: "Session aborted" });
                });
              });
            }

            // Auto-approve other tools
            return { behavior: "allow", updatedInput: input };
          }
        }
      });

      // Capture session_id from init message
      for await (const message of q) {
        // Extract session_id from system init message
        if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          const sdkSessionId = message.session_id;
          if (sdkSessionId) {
            session.claudeSessionId = sdkSessionId;
            onSessionUpdate?.({ claudeSessionId: sdkSessionId });
          }
        }

        // Send message to frontend
        sendMessage(message);

        // Check for result to update session status
        if (message.type === "result") {
          const status = message.subtype === "success" ? "completed" : "error";
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status, title: session.title }
          });
        }
      }

      // Query completed normally
      if (session.status === "running") {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "completed", title: session.title }
        });
      }

      // 会话结束后清理临时文件
      cleanupTempFiles(session.cwd ?? DEFAULT_CWD);
    } catch (error) {
      // 即使出错也尝试清理临时文件
      cleanupTempFiles(session.cwd ?? DEFAULT_CWD);

      if ((error as Error).name === "AbortError") {
        // Session was aborted, don't treat as error
        return;
      }
      onEvent({
        type: "session.status",
        payload: { sessionId: session.id, status: "error", title: session.title, error: String(error) }
      });
    }
  })();

  return {
    abort: () => abortController.abort()
  };
}
