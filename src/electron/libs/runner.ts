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
          // 使用 canUseTool 回调时，不设置 permissionMode，让 SDK 完全依赖我们的回调
          includePartialMessages: true,
          model: modelId,
          // 启用 Skills、Slash Commands 和 CLAUDE.md 支持
          settingSources: ["user", "project"],
          canUseTool: async (toolName, input, { signal }) => {
            console.log(`[canUseTool] Called for tool: ${toolName}`, JSON.stringify(input).slice(0, 200));
            
            // 需要用户确认的危险操作
            const DANGEROUS_TOOLS = [
              "Write",           // 写入/创建文件
              "Edit",            // 编辑文件
              "MultiEdit",       // 批量编辑
              "Bash",            // 执行命令
              "AskUserQuestion", // 询问用户
            ];

            // 检测 Bash 命令中的危险操作（删除命令等）
            const DANGEROUS_BASH_PATTERNS = [
              /\brm\s+/i,           // rm 命令
              /\brmdir\s+/i,        // rmdir 命令
              /\bdel\s+/i,          // Windows del 命令
              /\brd\s+/i,           // Windows rd 命令
              /\bRemove-Item\b/i,   // PowerShell Remove-Item
              /\bri\s+/i,           // PowerShell ri 别名
              /\brm\s+-rf?\b/i,     // rm -r / rm -rf
              /\bunlink\b/i,        // unlink 命令
            ];

            // 生成工具的权限键（用于会话级别的允许）
            const getToolPermissionKey = (name: string, toolInput: unknown): string => {
              // 对于 Bash 命令，检查是否是危险命令
              if (name === "Bash") {
                const bashInput = toolInput as { command?: string } | undefined;
                const command = bashInput?.command || "";
                for (const pattern of DANGEROUS_BASH_PATTERNS) {
                  if (pattern.test(command)) {
                    return `Bash:dangerous`; // 危险 Bash 命令单独分类
                  }
                }
              }
              return name;
            };

            const permissionKey = getToolPermissionKey(toolName, input);

            // 检查是否已在本次会话中允许过该工具
            if (session.sessionAllowedTools.has(permissionKey)) {
              return { behavior: "allow", updatedInput: input };
            }

            // 检查是否是危险操作
            const isDangerousTool = DANGEROUS_TOOLS.includes(toolName);
            
            // 对于 Bash 命令，额外检查是否包含危险操作
            let isDangerousBash = false;
            if (toolName === "Bash") {
              const bashInput = input as { command?: string } | undefined;
              const command = bashInput?.command || "";
              isDangerousBash = DANGEROUS_BASH_PATTERNS.some(pattern => pattern.test(command));
            }

            const needsPermission = isDangerousTool || isDangerousBash;

            if (needsPermission) {
              const toolUseId = crypto.randomUUID();
              console.log(`[canUseTool] Requesting permission for ${toolName}, toolUseId: ${toolUseId}`);

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
                    
                    // 处理 "allowSession" 行为 - 将工具添加到会话允许列表
                    const extendedResult = result as { behavior: "allow" | "deny"; updatedInput?: unknown; message?: string; allowSession?: boolean };
                    if (extendedResult.behavior === "allow" && extendedResult.allowSession) {
                      session.sessionAllowedTools.add(permissionKey);
                    }
                    
                    if (extendedResult.behavior === "allow") {
                      resolve({ behavior: "allow", updatedInput: extendedResult.updatedInput as Record<string, unknown> });
                    } else {
                      resolve({ behavior: "deny", message: extendedResult.message || "User denied the request" });
                    }
                  }
                });

                // Handle abort
                signal.addEventListener("abort", () => {
                  session.pendingPermissions.delete(toolUseId);
                  resolve({ behavior: "deny", message: "Session aborted" });
                });
              });
            }

            // Auto-approve safe tools (Read, Glob, Grep, LS, etc.)
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
