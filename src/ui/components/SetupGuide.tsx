import { useEffect, useState } from "react";

const SETUP_COMPLETED_KEY = "agent-cowork-setup-completed";

interface SetupGuideProps {
  onDismiss: () => void;
}

export function SetupGuide({ onDismiss }: SetupGuideProps) {
  const [envCheck, setEnvCheck] = useState<EnvCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);

  // Check if setup was already completed
  const wasSetupCompleted = () => {
    try {
      return localStorage.getItem(SETUP_COMPLETED_KEY) === "true";
    } catch {
      return false;
    }
  };

  const markSetupCompleted = () => {
    try {
      localStorage.setItem(SETUP_COMPLETED_KEY, "true");
    } catch {
      // Ignore storage errors
    }
  };

  const checkEnv = async () => {
    // If setup was already completed, skip the guide
    if (wasSetupCompleted()) {
      onDismiss();
      return;
    }

    try {
      const result = await window.electron.checkEnvironment();
      setEnvCheck(result);
      if (result.allPassed) {
        markSetupCompleted();
        // Auto dismiss after 1 second if all checks pass
        setTimeout(onDismiss, 1000);
      }
    } catch (error) {
      console.error("Failed to check environment:", error);
    } finally {
      setLoading(false);
      setRechecking(false);
    }
  };

  useEffect(() => {
    checkEnv();
  }, []);

  const handleRecheck = () => {
    setRechecking(true);
    checkEnv();
  };

  const handleOpenDocs = () => {
    window.electron.openExternal("https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-muted">检测环境中...</span>
        </div>
      </div>
    );
  }

  if (envCheck?.allPassed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-success" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-medium text-ink-800">环境检测通过</div>
            <div className="mt-1 text-sm text-muted">Claude Code {envCheck.claudeCodeVersion}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/5 bg-white p-8 shadow-elevated">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-warning" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-ink-800">需要安装 Claude Code</h2>
          <p className="mt-2 text-sm text-muted">本应用需要 Claude Code CLI 才能正常运行</p>
        </div>

        {/* Check Status */}
        <div className="mt-6 space-y-3">
          <CheckItem
            label="Claude Code CLI"
            passed={envCheck?.claudeCodeInstalled ?? false}
            detail={envCheck?.claudeCodeVersion || "未安装"}
          />
          <CheckItem
            label="API 认证"
            passed={envCheck?.apiKeyConfigured ?? false}
            detail={envCheck?.apiKeyConfigured ? "已配置" : "未配置"}
          />
        </div>

        {/* Installation Steps */}
        <div className="mt-6 rounded-xl bg-surface-secondary p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">安装步骤</div>
          <ol className="mt-3 space-y-3 text-sm text-ink-700">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">1</span>
              <div>
                <div className="font-medium">安装 Claude Code CLI</div>
                <code className="mt-1 block rounded bg-ink-900/5 px-2 py-1 text-xs font-mono text-ink-600">
                  npm install -g @anthropic-ai/claude-code
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">2</span>
              <div>
                <div className="font-medium">登录 Claude Code</div>
                <code className="mt-1 block rounded bg-ink-900/5 px-2 py-1 text-xs font-mono text-ink-600">
                  claude login
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">3</span>
              <div className="font-medium">点击下方按钮重新检测</div>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleOpenDocs}
            className="flex-1 rounded-full border border-ink-900/10 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary transition-colors"
          >
            查看文档
          </button>
          <button
            onClick={handleRecheck}
            disabled={rechecking}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {rechecking ? "检测中..." : "重新检测"}
          </button>
        </div>

        {/* Skip option */}
        <button
          onClick={() => {
            markSetupCompleted();
            onDismiss();
          }}
          className="mt-4 w-full text-center text-xs text-muted hover:text-ink-600 transition-colors"
        >
          跳过此步骤（部分功能可能不可用）
        </button>
      </div>
    </div>
  );
}

function CheckItem({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-900/5 bg-surface-secondary px-4 py-3">
      <div className="flex items-center gap-3">
        {passed ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-success" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-error/10">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-error" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <span className="text-sm font-medium text-ink-700">{label}</span>
      </div>
      <span className={`text-xs ${passed ? "text-success" : "text-muted"}`}>{detail}</span>
    </div>
  );
}
