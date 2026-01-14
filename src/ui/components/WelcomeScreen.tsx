import { useAppStore } from "../store/useAppStore";

interface QuickPrompt {
  icon: string;
  title: string;
  prompt: string;
  color: string;
}

const quickPrompts: QuickPrompt[] = [
  {
    icon: "🔍",
    title: "解释代码",
    prompt: "帮我解释一下这个项目的代码结构和主要功能",
    color: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: "🐛",
    title: "修复 Bug",
    prompt: "帮我找出并修复代码中的问题",
    color: "from-red-500/10 to-orange-500/10",
  },
  {
    icon: "✨",
    title: "添加功能",
    prompt: "帮我实现一个新功能：",
    color: "from-purple-500/10 to-pink-500/10",
  },
  {
    icon: "📝",
    title: "代码审查",
    prompt: "帮我审查最近的代码改动，提出优化建议",
    color: "from-green-500/10 to-emerald-500/10",
  },
  {
    icon: "🧪",
    title: "编写测试",
    prompt: "帮我为这个项目编写单元测试",
    color: "from-yellow-500/10 to-amber-500/10",
  },
  {
    icon: "🔧",
    title: "重构代码",
    prompt: "帮我重构这段代码，提高可读性和性能",
    color: "from-indigo-500/10 to-violet-500/10",
  },
];

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

export function WelcomeScreen({ onPromptSelect }: WelcomeScreenProps) {
  const cwd = useAppStore((s) => s.cwd);
  const setShowDirectorySelector = useAppStore((s) => s.setShowDirectorySelector);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Logo & Title */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-ink-800">你好，有什么可以帮你？</h1>
        <p className="mt-2 text-sm text-muted">我可以帮你编写代码、调试问题、解释概念等</p>
      </div>

      {/* Current Directory */}
      {cwd && (
        <button
          onClick={() => setShowDirectorySelector(true)}
          className="mb-8 flex items-center gap-2 rounded-full bg-surface-secondary px-4 py-2 text-sm text-ink-600 transition-colors hover:bg-surface-tertiary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="max-w-[300px] truncate font-mono text-xs">{cwd}</span>
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Quick Prompts Grid */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        {quickPrompts.map((item) => (
          <button
            key={item.title}
            onClick={() => onPromptSelect(item.prompt)}
            className={`group relative flex flex-col items-start gap-2 rounded-xl border border-ink-900/5 bg-gradient-to-br ${item.color} p-4 text-left transition-all hover:border-ink-900/10 hover:shadow-sm`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium text-ink-700 group-hover:text-ink-800">{item.title}</span>
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-10 flex items-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <kbd className="rounded bg-ink-900/5 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          <span>发送</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="rounded bg-ink-900/5 px-1.5 py-0.5 font-mono text-[10px]">Shift + Enter</kbd>
          <span>换行</span>
        </div>
      </div>
    </div>
  );
}
